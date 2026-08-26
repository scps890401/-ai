import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildReferenceSelection, classifyImageError, evaluateStickerQuality, routeImageTask } from "./stickerAgent";

describe("貼圖 Agent Router", () => {
  it("依目前修改圖、接受角色、角色、姿勢、風格的優先序建立可重現參考快照", () => {
    const selection = buildReferenceSelection({
      currentEditUrl: "/manus-storage/current.png",
      references: [
        { url: "/manus-storage/style.png", role: "style" },
        { url: "/manus-storage/pose.png", role: "pose" },
        { url: "/manus-storage/character.png", role: "character" },
        { url: "/manus-storage/accepted.png", role: "accepted_character", accepted: true },
      ],
      maxReferences: 4,
    });
    expect(selection.map((item) => item.url)).toEqual([
      "/manus-storage/current.png",
      "/manus-storage/accepted.png",
      "/manus-storage/character.png",
      "/manus-storage/pose.png",
    ]);
  });

  it("對新生成優先選 Gemini，對單張修改優先選 GPT Image，且明確標示未設定的 FLUX.2", () => {
    const generate = routeImageTask({ taskKind: "generate", references: [] });
    const edit = routeImageTask({ taskKind: "edit", references: [], currentEditUrl: "/manus-storage/sticker.png" });
    expect(generate.selectedProvider).toBe("gemini-3.1-flash-image");
    expect(edit.selectedProvider).toBe("gpt-image-2");
    expect(generate.candidates.find((item) => item.provider === "flux-2")).toMatchObject({ enabled: false });
  });

  it("將 quota、暫時性、政策與無效請求區分為安全的 fallback 決策", () => {
    expect(classifyImageError(new Error("429 resource_exhausted quota"))).toMatchObject({ kind: "quota", fallbackEligible: true });
    expect(classifyImageError(new Error("network timeout"))).toMatchObject({ kind: "transient", fallbackEligible: true });
    expect(classifyImageError(new Error("content policy blocked"))).toMatchObject({ kind: "policy", fallbackEligible: false });
    expect(classifyImageError(new Error("unsupported format"))).toMatchObject({ kind: "invalid_request", fallbackEligible: false });
  });

  it("品質檢查確認透明 PNG 與尺寸，並將極小受控測試素材標示為需要人工注意而非盲目重試", async () => {
    const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const report = await evaluateStickerQuality(png);
    expect(report).toMatchObject({ alphaVerified: true, dimensions: "32×32", outputReady: true, retryRecommended: false, textOverlayPending: true });
    expect(report.reasons).toContain("來源圖尺寸過小，僅適合作為受控測試素材。");
  });
});
