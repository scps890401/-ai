import { describe, expect, it } from "vitest";

const maybeIt = process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.OPENAI_API_KEY ? it : it.skip;

describe("伺服器端 Provider 憑證", () => {
  maybeIt("Google Gemini 與 OpenAI 金鑰皆可存取輕量模型端點", async () => {
    const [googleResponse, openAiResponse] = await Promise.all([
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`),
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }),
    ]);

    expect(googleResponse.ok).toBe(true);
    expect(openAiResponse.ok).toBe(true);
  }, 15_000);
});
