import { describe, expect, it } from "vitest";
import { characterProfileSchema } from "./characterRouter";

describe("character profile contract", () => {
  it("accepts the fields required for consistent sticker generation", () => {
    const profile = characterProfileSchema.parse({
      species: "兔子",
      identity: "黑白相間的寵物兔",
      face: "額頭有白色縱線，眼睛圓亮",
      hairOrFur: "黑白短毛，耳朵尖端偏黑",
      body: "小型、圓身、短前肢",
      clothing: "無",
      accessories: "粉紅牽繩",
      colors: "黑、白、粉紅",
      proportions: "頭大身小的可愛比例",
      styleAnchors: "溫暖手繪、粗白邊、清楚輪廓",
      preserve: ["黑白臉部花紋", "粉紅牽繩"],
      negative: ["不要增加肢體", "不要改成其他物種"],
    });
    expect(profile.preserve).toContain("黑白臉部花紋");
    expect(profile.negative).toContain("不要增加肢體");
  });

  it("rejects oversized untrusted visual-bible fields", () => {
    expect(() => characterProfileSchema.parse({
      species: "兔子",
      identity: "x".repeat(301),
      face: "",
      hairOrFur: "",
      body: "",
      clothing: "",
      accessories: "",
      colors: "",
      proportions: "",
      styleAnchors: "",
      preserve: [],
      negative: [],
    })).toThrow();
  });
});
