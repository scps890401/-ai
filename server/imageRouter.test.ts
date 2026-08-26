import { describe, expect, it, vi, beforeEach } from "vitest";
import { classifyImageRouteError, resetImageProviderHealth, routeStickerImage, selectImageProviderCandidates, shouldFallbackImageRoute } from "./imageRouter";

describe("image model router", () => {
  beforeEach(() => resetImageProviderHealth());

  it("uses GPT Image 2 first and falls back only for recoverable failures", async () => {
    const generator = vi.fn()
      .mockRejectedValueOnce(new Error("service unavailable 503"))
      .mockResolvedValueOnce({ url: "https://generated.test/fallback.png" });
    const result = await routeStickerImage({ prompt: "兔子揮手", task: "generate" }, generator);
    expect(result.provider).toBe("internal-service-default");
    expect(generator.mock.calls[0]?.[0]).toMatchObject({ model: "MODEL_GPT_IMAGE_2" });
    expect(generator.mock.calls[1]?.[0]).toMatchObject({ model: "MODEL_SERVICE_DEFAULT" });
  });

  it("pauses after quota exhaustion instead of triggering a potentially costly fallback", async () => {
    const generator = vi.fn().mockRejectedValue(new Error("usage exhausted"));
    await expect(routeStickerImage({ prompt: "兔子睡覺", task: "edit" }, generator)).rejects.toThrow("quota_exhausted");
    expect(generator).toHaveBeenCalledTimes(1);
    expect(shouldFallbackImageRoute(classifyImageRouteError(new Error("usage exhausted")))).toBe(false);
  });

  it("does not include unconfigured external providers in automatic candidates", () => {
    expect(selectImageProviderCandidates({ prompt: "test", task: "generate" })).toEqual(["internal-gpt-image-2", "internal-service-default"]);
  });
});
