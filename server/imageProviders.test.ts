import { describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  generateImage: vi.fn(async () => ({ b64Json: "cG5n", mimeType: "image/png" })),
  listImageModels: vi.fn(async () => ({ models: [{ id: "gpt-image-2", model: "MODEL_GPT_IMAGE_2" }] })),
  generateGeminiImage: vi.fn(async () => ({ b64Json: "anBlZw==", mimeType: "image/jpeg" as const, provider: "gemini", interactionId: "interaction-test" })),
}));

vi.mock("./_core/imageGeneration", () => ({ generateImage: mock.generateImage, listImageModels: mock.listImageModels }));
vi.mock("./geminiImage", () => ({ GeminiImageError: class GeminiImageError extends Error {}, generateGeminiImage: mock.generateGeminiImage }));

const { executeProviderTask, getImageProviderAdapter } = await import("./imageProviders");

describe("統一圖像 Provider Adapter", () => {
  it("以 Gemini Adapter 執行多參考生成並保留 interaction metadata", async () => {
    const result = await executeProviderTask({ provider: "gemini-3.1-flash-image", taskKind: "generate", prompt: "cute rabbit", references: [{ url: "https://example.test/character.jpg", mimeType: "image/jpeg" }, { url: "https://example.test/pose.jpg", mimeType: "image/jpeg" }] });
    expect(mock.generateGeminiImage).toHaveBeenCalledWith(expect.objectContaining({ prompt: "cute rabbit", references: expect.arrayContaining([expect.objectContaining({ mimeType: "image/jpeg" })]) }));
    expect(result).toMatchObject({ provider: "gemini-3.1-flash-image", interactionId: "interaction-test", mimeType: "image/jpeg" });
  });

  it("以 GPT Image Adapter 將目前圖片和參考圖送往 edit 工作流", async () => {
    const result = await executeProviderTask({ provider: "gpt-image-2", taskKind: "edit", prompt: "make the eyes bigger", currentImage: { url: "https://example.test/current.png", mimeType: "image/png" }, references: [{ url: "https://example.test/style.jpg", mimeType: "image/jpeg" }] });
    expect(mock.generateImage).toHaveBeenCalledWith(expect.objectContaining({ prompt: "make the eyes bigger", originalImages: [expect.objectContaining({ url: "https://example.test/current.png" }), expect.objectContaining({ url: "https://example.test/style.jpg" })] }));
    expect(result).toMatchObject({ provider: "gpt-image-2", mimeType: "image/png" });
  });

  it("將 FLUX 保持為未設定的 disabled Adapter，不會冒充可用 fallback", async () => {
    const flux = getImageProviderAdapter("flux-2");
    await expect(flux.healthCheck()).resolves.toMatchObject({ status: "disabled", configured: false });
    await expect(executeProviderTask({ provider: "flux-2", taskKind: "generate", prompt: "rabbit", references: [] })).rejects.toThrow(/尚未設定/);
  });

  it("以 Forge 模型清單作為 GPT Image healthCheck 的 server-side 健康依據", async () => {
    await expect(getImageProviderAdapter("gpt-image-2").healthCheck()).resolves.toMatchObject({ status: "healthy", configured: true });
    expect(mock.listImageModels).toHaveBeenCalledTimes(1);
  });

  it("拒絕缺少 current image 的 edit，避免產生無法追溯的修改版本", async () => {
    await expect(executeProviderTask({ provider: "gpt-image-2", taskKind: "edit", prompt: "change", references: [] })).rejects.toThrow(/缺少目前版本圖片/);
  });
});
