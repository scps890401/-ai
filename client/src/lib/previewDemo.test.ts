import { describe, expect, it } from "vitest";
import { PREVIEW_DEMO, previewStageLabel } from "./previewDemo";

describe("public preview demo data", () => {
  it("uses fixed non-user project data and a complete eight-sticker flow", () => {
    expect(PREVIEW_DEMO.stickers).toHaveLength(8);
    expect(PREVIEW_DEMO.projectName).toContain("兔子");
    expect(previewStageLabel(0)).toBe("分析角色");
    expect(previewStageLabel(99)).toBe("完成");
  });
});
