import { describe, expect, it } from "vitest";
import { addRandomSticker, randomGenerationError, replaceStickerAt } from "./randomStickerUi";
import { generateWithRetry, regenerateSingleSticker } from "./retryRandomSticker";

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

  it("replaces only the selected sticker after a single-card retry", () => {
    const current = [
      { src: "first.png", label: "兔子／趴下睡覺", color: "gold", source: "rabbit.jpg", action: "趴下睡覺" },
      { src: "second.png", label: "狗狗／探頭打招呼", color: "gold", source: "dog.jpg", action: "探頭打招呼" },
    ];
    const next = replaceStickerAt(current, 1, { url: "second-retry.png" });

    expect(next[0]).toEqual(current[0]);
    expect(next[1]).toMatchObject({ src: "second-retry.png", label: "狗狗／探頭打招呼", source: "dog.jpg", action: "探頭打招呼" });
  });

  it("retries a failed AI request at most three times and preserves the input photo", async () => {
    let calls = 0;
    const waits: number[] = [];
    const result = await generateWithRetry(async (input) => {
      calls += 1;
      expect(input.originalImage.b64Json).toBe("rabbit-photo-data");
      if (calls < 3) throw new Error("temporary failure");
      return { url: "rabbit-retry.png" };
    }, { prompt: "趴下睡覺", originalImage: { b64Json: "rabbit-photo-data", mimeType: "image/png" } }, 3, async (milliseconds) => { waits.push(milliseconds); });

    expect(result).toEqual({ url: "rabbit-retry.png" });
    expect(calls).toBe(3);
    expect(waits).toEqual([350, 700]);
  });

  it("stops retrying after a successful first request", async () => {
    let calls = 0;
    const result = await generateWithRetry(async () => { calls += 1; return { url: "first-success.png" }; }, { prompt: "早安", originalImage: { b64Json: "dog-photo-data", mimeType: "image/jpeg" } }, 3);

    expect(result.url).toBe("first-success.png");
    expect(calls).toBe(1);
  });

  it("rejects after the retry limit is exhausted", async () => {
    let calls = 0;
    await expect(generateWithRetry(async () => { calls += 1; throw new Error("service unavailable"); }, { prompt: "探頭打招呼", originalImage: { b64Json: "mouse-photo-data", mimeType: "image/png" } }, 3)).rejects.toThrow("service unavailable");
    expect(calls).toBe(3);
  });

  it("regenerates one card using its source and action before replacing only its image", async () => {
    const sticker = { src: "old.png", label: "狗狗／探頭打招呼", color: "gold", source: "dog-photo.jpg", action: "探頭打招呼" };
    const calls: Array<{ prompt: string; image: string }> = [];
    const refreshed = await regenerateSingleSticker(sticker, async (source) => ({ b64Json: `encoded:${source}`, mimeType: "image/jpeg" }), async (input) => {
      calls.push({ prompt: input.prompt, image: input.originalImage.b64Json });
      return { url: "dog-retry.png" };
    });

    expect(calls).toEqual([{ prompt: "探頭打招呼", image: "encoded:dog-photo.jpg" }]);
    expect(refreshed).toMatchObject({ src: "dog-retry.png", label: sticker.label, source: sticker.source, action: sticker.action });
  });

  it("describes the actual source count instead of hard-coding four materials", () => {
    expect(randomGenerationError(1, new Error("temporary failure"))).toEqual({
      title: "AI 隨機生成失敗",
      description: "已處理 1 張素材，但生成服務沒有完成，請稍後再試。",
    });
  });

  it("explains exhausted image quota clearly", () => {
    expect(randomGenerationError(1, new Error("failed_precondition: usage exhausted"))).toEqual({
      title: "AI 影像服務暫時無法生成",
      description: "目前影像生成額度已用完，1 張素材尚未產生新貼圖；請稍後再試。",
    });
  });
});
