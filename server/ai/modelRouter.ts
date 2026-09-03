/**
 * Server-side model router with strict zero-spend, fail-closed semantics.
 * This module intentionally has no automatic paid-provider fallback.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { stepCountIs, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { ToolCallMeta } from "@shared/chat";
import { GOOGLE_FREE_TIER_POLICY } from "./provider";
import { assertZeroSpendAllowed } from "./zeroSpendGuard";
import { SUIXIN_SYSTEM_PROMPT } from "./systemPrompt";
import { createAgentTools, extractStickerIntent } from "./toolRegistry";

const PRIMARY_MODEL = process.env.AI_PRIMARY_MODEL ?? "gemini-3.6-flash";
const PROVIDER_TIMEOUT_MS = 12_000;

type ModelCandidate = {
  provider: "google";
  modelId: string;
  model: LanguageModel;
};

export type RouterEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; toolCall: ToolCallMeta };

export type RouterInput = {
  messages: ModelMessage[];
  recentUserContent: string[];
  abortSignal: AbortSignal;
};

function configuredCandidates(): ModelCandidate[] {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("ZERO_SPEND_GUARD_BLOCKED:google:DISABLED:No explicitly allowed free provider is configured.");
  }

  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
  return [{ provider: "google", modelId: PRIMARY_MODEL, model: google(PRIMARY_MODEL) }];
}

async function* streamWithModel(candidate: ModelCandidate, input: RouterInput): AsyncGenerator<RouterEvent> {
  assertZeroSpendAllowed({ ...GOOGLE_FREE_TIER_POLICY });

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
  const candidate = candidates[0];
  if (!candidate) throw new Error("No explicitly allowed zero-cost AI provider is configured.");

  console.info(`[AI Router] starting ${candidate.provider}:${candidate.modelId}`);
  for await (const event of streamWithModel(candidate, input)) {
    yield event;
  }
}
