/**
 * 伺服器串流 Hook：瀏覽器只呼叫同源 `/api/chat`，不持有模型名稱、Provider 位址或任何 API Key。
 */

import { useCallback, useRef } from "react";
import type { AttachmentMeta, ToolCallMeta } from "@shared/chat";

export type ChatStreamCallbacks = {
  onMeta: (threadId: string) => void;
  onDelta: (text: string) => void;
  onTool: (toolCall: ToolCallMeta) => void;
  onStatus: (message: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

type StartChatInput = {
  threadId?: string;
  clientId: string;
  messageId: string;
  message: string;
  attachments: AttachmentMeta[];
};

export function useChatStream() {
  const controllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const start = useCallback(async (input: StartChatInput, callbacks: ChatStreamCallbacks) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || "無法建立對話串流。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventBlock of events) {
          const eventName = eventBlock.match(/^event: (.+)$/m)?.[1];
          const rawData = eventBlock.match(/^data: (.+)$/m)?.[1];
          if (!eventName || !rawData) continue;
          const data = JSON.parse(rawData) as Record<string, unknown>;
          if (eventName === "meta" && typeof data.threadId === "string") callbacks.onMeta(data.threadId);
          if (eventName === "delta" && typeof data.text === "string") callbacks.onDelta(data.text);
          if (eventName === "tool" && data.toolCall) callbacks.onTool(data.toolCall as ToolCallMeta);
          if (eventName === "status" && typeof data.message === "string") callbacks.onStatus(data.message);
          if (eventName === "error" && typeof data.message === "string") callbacks.onError(data.message);
          if (eventName === "done") callbacks.onDone();
        }
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        callbacks.onError(error instanceof Error ? error.message : "串流發生未預期錯誤。");
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  return { start, stop };
}
