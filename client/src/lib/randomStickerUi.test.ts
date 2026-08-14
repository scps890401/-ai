import { describe, expect, it } from "vitest";
import { addRandomSticker, randomGenerationError } from "./randomStickerUi";

describe("random sticker UI flow", () => {
  it("adds the AI result URL to the sticker shelf in newest-first order", () => {
    const current = [{ src: "old.png", label: "狗狗／真棒", color: "red" }];
    const next = addRandomSticker(current, { url: "generated-rabbit.png", label: "兔子／趴下睡覺" }, 8);

    expect(next[0]).toEqual({ src: "generated-rabbit.png", label: "兔子／趴下睡覺", color: "gold" });
    expect(next).toHaveLength(2);
  });

  it("keeps the selected pack size when trimming generated cards", () => {
    const current = Array.from({ length: 8 }, (_, index) => ({ src: `${index}.png`, label: `素材／${index}`, color: "gold" }));
    const next = addRandomSticker(current, { url: "new.png", label: "素材／新結果" }, 8);

    expect(next).toHaveLength(8);
    expect(next[0]?.src).toBe("new.png");
    expect(next.find((sticker) => sticker.src === "6.png")).toBeDefined();
    expect(next.find((sticker) => sticker.src === "7.png")).toBeUndefined();
  });

  it("provides the error copy used by the failed AI generation branch", () => {
    expect(randomGenerationError()).toEqual({
      title: "AI 隨機生成失敗",
      description: "照片已送出但生成服務沒有完成，請稍後再試。",
    });
  });
});
