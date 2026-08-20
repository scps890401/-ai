import { describe, expect, it } from "vitest";
import { buildCutoutPrompt, buildRefinementPrompt, buildStickerPrompt } from "./routers";

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
});
