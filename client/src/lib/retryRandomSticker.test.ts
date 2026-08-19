import { describe, expect, it, vi } from "vitest";
import { generateWithRetry, isNonRetryableGenerationError } from "./retryRandomSticker";

describe("generation retry recovery", () => {
  it("recognizes exhausted image-service quota as non-retryable", () => {
    expect(isNonRetryableGenerationError(new Error("Image generation request failed: usage exhausted"))).toBe(true);
    expect(isNonRetryableGenerationError(new Error("temporary network failure"))).toBe(false);
  });

  it("stops immediately when image-service quota is exhausted", async () => {
    const generator = vi.fn().mockRejectedValue(new Error("failed_precondition: usage exhausted"));
    await expect(generateWithRetry(generator, { prompt: "test", originalImage: { b64Json: "x", mimeType: "image/png" } }, 3)).rejects.toThrow("usage exhausted");
    expect(generator).toHaveBeenCalledTimes(1);
  });
});
