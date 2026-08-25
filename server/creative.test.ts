import { describe, expect, it } from "vitest";
import { buildCharacterSamplePrompt, buildCharacterVariationPrompt, buildCutoutPrompt, buildFallbackProjectPlan, buildRefinementPrompt, buildStickerPrompt } from "./routers";

describe("creative prompt builders", () => {
  it("keeps character identity and user direction in the generation prompt", () => {
    const prompt = buildStickerPrompt({ style: "可愛手繪", emotion: "開心", prompt: "讓角色揮手說早安" });
    expect(prompt).toContain("Preserve the exact character identity");
    expect(prompt).toContain("可愛手繪");
    expect(prompt).toContain("讓角色揮手說早安");
  });

  it("asks semantic cutout to preserve pale character details", () => {
    const prompt = buildCutoutPrompt();
    expect(prompt).toContain("semantic subject understanding");
    expect(prompt).toContain("pale or white areas");
    expect(prompt).toContain("transparent background");
  });

  it("turns a chat instruction and visual plan into an edit prompt", () => {
    const prompt = buildRefinementPrompt("文字改成早安", "保留角色姿勢，只替換對話文字");
    expect(prompt).toContain("文字改成早安");
    expect(prompt).toContain("保留角色姿勢");
    expect(prompt).toContain("no watermark");
  });

  it("creates a complete editable fallback plan when AI planning is unavailable", () => {
    const plan = buildFallbackProjectPlan({ brief: "製作日常貼圖", style: "可愛手繪", stickerCount: 4 });
    expect(plan.fallback).toBe(true);
    expect(plan.scripts).toHaveLength(4);
    expect(plan.scripts.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    expect(plan.scripts.every((item) => item.phrase.length > 0 && item.scene.length > 0)).toBe(true);
  });

  it("creates a text-only character sample prompt from the three minimal fields", () => {
    const prompt = buildCharacterSamplePrompt({ characterNeed: "戴圓眼鏡的橘貓店長", action: "揮手", text: "歡迎光臨" });
    expect(prompt).toContain("戴圓眼鏡的橘貓店長");
    expect(prompt).toContain("揮手");
    expect(prompt).toContain("歡迎光臨");
    expect(prompt).toContain("transparent background");
  });

  it("uses an approved sample as the identity contract for later variations", () => {
    const prompt = buildCharacterVariationPrompt({ characterNeed: "戴圓眼鏡的橘貓店長", action: "端咖啡", text: "請慢用" });
    expect(prompt).toContain("exact approved character reference");
    expect(prompt).toContain("Preserve the same character identity");
    expect(prompt).toContain("端咖啡");
    expect(prompt).toContain("請慢用");
  });
});
