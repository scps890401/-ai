/**
 * Provider Abstraction / Model Router：以 Vercel AI SDK Core 統一模型呼叫，優先模型逾時或失敗時自動切換備援模型。
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { ToolCallMeta } from "@shared/chat";
import { SUIXIN_SYSTEM_PROMPT } from "./systemPrompt";
import { createAgentTools, extractStickerIntent } from "./toolRegistry";

const PRIMARY_MODEL = process.env.AI_PRIMARY_MODEL ?? "gemini-3.6-flash";
const FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL ?? "gpt-4o-mini";
const PROVIDER_TIMEOUT_MS = 12_000;

export type RouterEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; toolCall: ToolCallMeta }
  | { type: "fallback"; from: string; to: string };

export type RouterInput = {
  messages: ModelMessage[];
  recentUserContent: string[];
  abortSignal: AbortSignal;
};

type ModelCandidate = {
  provider: "google" | "openai";
  modelId: string;
  model: LanguageModel;
};

function configuredCandidates(): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    candidates.push({ provider: "google", modelId: PRIMARY_MODEL, model: google(PRIMARY_MODEL) });
  }
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    candidates.push({ provider: "openai", modelId: FALLBACK_MODEL, model: openai(FALLBACK_MODEL) });
  }
  if (!candidates.length) throw new Error("No server-side AI provider is configured.");
  return candidates;
}

async function* streamWithModel(candidate: ModelCandidate, input: RouterInput): AsyncGenerator<RouterEvent> {
  const queuedToolEvents: ToolCallMeta[] = [];
  const stickerIntent = extractStickerIntent(
    input.recentUserContent.at(-1) ?? "",
    input.recentUserContent.slice(0, -1),
  );
  const tools = createAgentTools({
    onToolComplete: toolCall => queuedToolEvents.push(toolCall),
  });
  const result = streamText({
    model: candidate.model,
    system: SUIXIN_SYSTEM_PROMPT,
    messages: input.messages,
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(2),
    prepareStep: ({ stepNumber }) => {
      if (!stickerIntent) return { toolChoice: "auto" };
      return stepNumber === 0
        ? { toolChoice: { type: "tool", toolName: "plan_sticker_pack" } }
        : { toolChoice: "none" };
    },
    timeout: PROVIDER_TIMEOUT_MS,
    abortSignal: input.abortSignal,
    onToolExecutionStart: event => {
      const toolName = "toolCall" in event ? event.toolCall.toolName : "dynamic-tool";
      console.info(`[Tool] ${toolName} started`);
    },
    onError: ({ error }) => console.error("[AI Router] streamed provider error", error),
  });

  let emittedText = false;
  for await (const text of result.textStream) {
    while (queuedToolEvents.length) {
      const toolCall = queuedToolEvents.shift();
      if (toolCall) yield { type: "tool", toolCall };
    }
    if (text) {
      emittedText = true;
      yield { type: "delta", text };
    }
  }

  while (queuedToolEvents.length) {
    const toolCall = queuedToolEvents.shift();
    if (toolCall) yield { type: "tool", toolCall };
  }

  if (!emittedText) {
    throw new Error(`${candidate.provider}:${candidate.modelId} completed without text output.`);
  }
}

export async function* streamRoutedResponse(input: RouterInput): AsyncGenerator<RouterEvent> {
  const candidates = configuredCandidates();
  let latestError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      console.info(`[AI Router] starting ${candidate.provider}:${candidate.modelId}`);
      for await (const event of streamWithModel(candidate, input)) {
        yield event;
      }
      return;
    } catch (error) {
      latestError = error;
      const fallback = candidates[index + 1];
      if (!fallback || input.abortSignal.aborted) break;
      console.warn(`[AI Router] ${candidate.provider}:${candidate.modelId} failed; switching to ${fallback.provider}:${fallback.modelId}`, error);
      yield { type: "fallback", from: `${candidate.provider}:${candidate.modelId}`, to: `${fallback.provider}:${fallback.modelId}` };
    }
  }

  throw latestError instanceof Error ? latestError : new Error("All configured AI providers failed.");
}
