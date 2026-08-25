import { describe, expect, it } from "vitest";

describe("Gemini API credential", () => {
  it("authenticates a lightweight model catalog request without exposing the key", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey, "GEMINI_API_KEY must be configured").toBeTruthy();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey! },
    });

    expect(response.ok, `Gemini model catalog request failed with ${response.status}`).toBe(true);
    const payload = await response.json() as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 30_000);
});
