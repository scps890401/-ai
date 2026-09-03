/**
 * Phase 2 SSE API：`POST /api/chat` 只在伺服器端操作模型與資料庫，瀏覽器只接收文字、工具事件和完成訊號。
 */

import { Router, type Request, type Response } from "express";
import type { ModelMessage } from "ai";
import { z } from "zod";
import type { AttachmentMeta, PersistedChatMessage, StickerTextLayer, ToolCallMeta } from "@shared/chat";
import { createThread, findThread, getThreadMessages, insertMessage } from "./db";
import { streamRoutedResponse } from "./ai/modelRouter";

const attachmentSchema = z.object({
  id: z.string().min(1).max(96),
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  size: z.number().int().nonnegative().max(50 * 1024 * 1024),
  source: z.union([
    z.object({ kind: z.literal("data_url"), value: z.string().min(1) }),
    z.object({ kind: z.literal("s3_url"), value: z.string().url() }),
  ]).optional(),
});

const chatRequestSchema = z.object({
  threadId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  message: z.string().trim().max(8_000),
  attachments: z.array(attachmentSchema).max(8).default([]),
});

const historyQuerySchema = z.object({
  threadId: z.string().uuid(),
  clientId: z.string().uuid(),
});

function writeEvent(res: Response, event: string, payload: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function serializeMessage(message: Awaited<ReturnType<typeof getThreadMessages>>[number]): PersistedChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    attachments: (message.attachments ?? []) as AttachmentMeta[],
    toolCalls: (message.toolCalls ?? []) as ToolCallMeta[],
    textLayers: (message.textLayers ?? []) as StickerTextLayer[],
    createdAt: message.createdAt.toISOString(),
  };
}

function toModelMessages(messages: Awaited<ReturnType<typeof getThreadMessages>>): ModelMessage[] {
  return messages
    .filter(message => message.role === "user" || message.role === "assistant")
    .map(message => {
      if (message.role === "assistant") return { role: "assistant", content: message.content };
      const images = ((message.attachments ?? []) as AttachmentMeta[])
        .filter(attachment => attachment.mimeType.startsWith("image/") && attachment.source)
        .map(attachment => ({ type: "image" as const, image: attachment.source!.value }));
      if (!images.length) return { role: "user", content: message.content };
      return {
        role: "user",
        content: [{ type: "text" as const, text: message.content }, ...images],
      };
    }) as ModelMessage[];
}

export function registerChatApi(app: Router) {
  app.get("/api/chat/thread", async (req, res) => {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid thread request." });
      return;
    }

    const thread = await findThread(parsed.data.threadId, parsed.data.clientId);
    if (!thread) {
      res.status(404).json({ error: "Thread not found." });
      return;
    }

    const messages = await getThreadMessages(thread.id, 100);
    res.json({ threadId: thread.id, messages: messages.map(serializeMessage) });
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success || (!parsed.data.message && parsed.data.attachments.length === 0)) {
      res.status(400).json({ error: "A message or attachment is required." });
      return;
    }

    const { clientId, message, attachments } = parsed.data;
    let thread = parsed.data.threadId ? await findThread(parsed.data.threadId, clientId) : null;
    if (parsed.data.threadId && !thread) {
      res.status(404).json({ error: "Thread not found." });
      return;
    }
    if (!thread) {
      thread = await createThread({
        id: crypto.randomUUID(),
        clientId,
        title: message.slice(0, 72) || "新的創作想法",
      });
    }

    const userMessageId = parsed.data.messageId ?? crypto.randomUUID();
    await insertMessage({
      id: userMessageId,
      threadId: thread.id,
      role: "user",
      content: message || "[已附加檔案]",
      attachments: attachments as AttachmentMeta[],
      toolCalls: [],
      textLayers: [],
    });
    const context = await getThreadMessages(thread.id, 20);

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    writeEvent(res, "meta", { threadId: thread.id });

    const abortController = new AbortController();
    let completed = false;
    res.on("close", () => {
      if (!completed) abortController.abort();
    });

    let assistantContent = "";
    const toolCalls: ToolCallMeta[] = [];
    try {
      const recentUserContent = context.filter(item => item.role === "user").map(item => item.content);
      for await (const event of streamRoutedResponse({
        messages: toModelMessages(context),
        recentUserContent,
        abortSignal: abortController.signal,
      })) {
        if (event.type === "delta") {
          assistantContent += event.text;
          writeEvent(res, "delta", { text: event.text });
        }
        if (event.type === "tool") {
          toolCalls.push(event.toolCall);
          writeEvent(res, "tool", { toolCall: event.toolCall });
        }
      }

      if (!assistantContent.trim()) {
        throw new Error("The AI provider completed without content.");
      }
      const assistantMessageId = crypto.randomUUID();
      await insertMessage({
        id: assistantMessageId,
        threadId: thread.id,
        role: "assistant",
        content: assistantContent,
        attachments: [],
        toolCalls,
        textLayers: [],
      });
      writeEvent(res, "done", { threadId: thread.id, assistantMessageId });
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error("[Chat API] generation failed", error);
        writeEvent(res, "error", { message: "回覆暫時無法完成，請再試一次。" });
      }
    } finally {
      completed = true;
      res.end();
    }
  });
}
