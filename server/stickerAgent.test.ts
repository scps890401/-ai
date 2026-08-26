import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildReferenceSelection, classifyImageError, evaluateStickerQuality, routeImageTask, shouldAutoRepair } from "./stickerAgent";

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

  it("依健康狀態與一致性／批次需求安全重排候選，並在主要 Provider quota 時選用可用後備", () => {
    const health = {
      "gemini-3.1-flash-image": { provider: "gemini-3.1-flash-image" as const, status: "quota_exhausted" as const, configured: true, supports: ["generate", "edit"], detail: "quota", checkedAt: "2026-08-26T00:00:00.000Z", latencyMs: 1 },
      "gpt-image-2": { provider: "gpt-image-2" as const, status: "healthy" as const, configured: true, supports: ["generate", "edit", "cutout"], detail: "ready", checkedAt: "2026-08-26T00:00:00.000Z", latencyMs: 1 },
      "flux-2": { provider: "flux-2" as const, status: "disabled" as const, configured: false, supports: [], detail: "unconfigured", checkedAt: "2026-08-26T00:00:00.000Z", latencyMs: 1 },
    };
    const decision = routeImageTask({ taskKind: "generate", references: [{ url: "/anchor.png", role: "accepted_character", accepted: true }], providerHealth: health, requirements: { requiresHighConsistency: true, batchSize: 40, speedPriority: "high", costPriority: "high", requiresText: true } });
    expect(decision.selectedProvider).toBe("gpt-image-2");
    expect(decision.candidates.find((item) => item.provider === "gemini-3.1-flash-image")).toMatchObject({ enabled: false, healthStatus: "quota_exhausted" });
    expect(decision.candidates.find((item) => item.provider === "flux-2")).toMatchObject({ enabled: false, healthStatus: "disabled" });
    expect(decision.referenceSnapshot[0]?.role).toBe("accepted_character");
  });

  it("將 quota、暫時性、政策與無效請求區分為安全的 fallback 決策", () => {
    expect(classifyImageError(new Error("429 resource_exhausted quota"))).toMatchObject({ kind: "quota", fallbackEligible: true });
    expect(classifyImageError(new Error("network timeout"))).toMatchObject({ kind: "transient", fallbackEligible: true });
    expect(classifyImageError(new Error("content policy blocked"))).toMatchObject({ kind: "policy", fallbackEligible: false });
    expect(classifyImageError(new Error("unsupported format"))).toMatchObject({ kind: "invalid_request", fallbackEligible: false });
  });

  it("品質檢查回傳 pass／fail、原因與修正建議，並只允許一次安全自動修正", async () => {
    const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const report = await evaluateStickerQuality(png);
    expect(report).toMatchObject({ verdict: "fail", alphaVerified: true, dimensions: "32×32", outputReady: false, retryRecommended: true, textOverlayPending: true, semanticReview: "not_available" });
    expect(report.reasons).toContain("來源圖尺寸過小，無法安全用於貼圖輸出。");
    expect(shouldAutoRepair(report, 0)).toBe(true);
    expect(shouldAutoRepair(report, 1)).toBe(false);

    const opaque = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 30, g: 120, b: 200, alpha: 1 } } }).png().toBuffer();
    await expect(evaluateStickerQuality(opaque)).resolves.toMatchObject({ verdict: "fail", retryRecommended: true, suggestedFix: expect.stringMatching(/去背/) });

    const valid = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from("<svg width=\"256\" height=\"256\"><circle cx=\"128\" cy=\"128\" r=\"88\" fill=\"#f6a33e\"/></svg>") }]).png().toBuffer();
    await expect(evaluateStickerQuality(valid, { phrase: "謝謝" })).resolves.toMatchObject({ verdict: "pass", outputReady: true, retryRecommended: false });
  });
});
