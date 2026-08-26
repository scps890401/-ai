import { describe, expect, it, vi, beforeEach } from "vitest";
import { classifyImageRouteError, createImageProviderAdapters, describeImageRouteSelection, inspectImageProviderHealth, resetImageProviderHealth, routeStickerImage, selectImageProviderCandidates, shouldFallbackImageRoute } from "./imageRouter";

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

  it("exposes the same replaceable adapter interface for every provider", async () => {
    const adapters = createImageProviderAdapters();
    expect(adapters).toHaveLength(4);
    for (const adapter of adapters) {
      expect(adapter.generate).toBeTypeOf("function");
      expect(adapter.edit).toBeTypeOf("function");
      expect(adapter.analyze).toBeTypeOf("function");
      expect(adapter.healthCheck).toBeTypeOf("function");
    }
    const health = await inspectImageProviderHealth(adapters);
    expect(health.find((item) => item.provider === "gemini")).toMatchObject({ configured: false, healthy: false });
  });

  it("routes semantic character and pose references before a generic image task", () => {
    const candidates = selectImageProviderCandidates({ prompt: "角色做指定姿勢", task: "generate", references: [{ role: "character", image: { b64Json: "a".repeat(24), mimeType: "image/png" }, priority: 100 }, { role: "pose", image: { b64Json: "b".repeat(24), mimeType: "image/png" }, priority: 80 }] });
    expect(candidates).toEqual(["internal-gpt-image-2", "internal-service-default"]);
    expect(describeImageRouteSelection({ prompt: "角色做指定姿勢", task: "generate", highCharacterConsistency: true }, "internal-gpt-image-2")).toContain("角色");
  });
});
