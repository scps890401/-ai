import { afterEach, describe, expect, it } from "vitest";
import { streamRoutedResponse } from "./modelRouter";

const originalGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const originalOpenAIKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalGoogleKey === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  else process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGoogleKey;
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
});

describe("model router zero-spend boundary", () => {
  it("does not use OpenAI when its key is the only configured key", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.OPENAI_API_KEY = "present-but-not-permission";

    const response = streamRoutedResponse({
      messages: [],
      recentUserContent: [],
      abortSignal: new AbortController().signal,
    });

    await expect(response.next()).rejects.toThrow("ZERO_SPEND_GUARD_BLOCKED:google:DISABLED");
  });
});
