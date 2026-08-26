import { beforeEach, describe, expect, it } from "vitest";
import { buildLotteryStickerPrompt, buildRandomStickerPrompt, generateLotterySticker, generateRandomSticker, lotteryStickerInput, randomStickerInput } from "./stickers";
import { resetImageProviderHealth } from "./imageRouter";

describe("random sticker generation", () => {
  beforeEach(() => resetImageProviderHealth());
  it("builds a no-reference lottery prompt from an original concept", () => {
    const prompt = buildLotteryStickerPrompt({ text: "早安，今天也要亮晶晶", action: "從棉被探出頭伸懶腰", character: "圓滾滾的小兔子", creative: "晨光、吐司與小星星" });
    expect(prompt).toContain("with no reference photo");
    expect(prompt).toContain("早安，今天也要亮晶晶");
    expect(prompt).toContain("圓滾滾的小兔子");
  });

  it("generates a lottery sticker without sending original images", async () => {
    const calls: Array<{ prompt: string; originalImages?: unknown }> = [];
    const result = await generateLotterySticker({ text: "先笑再說", action: "戴著派對眼鏡噴出彩帶", character: "小企鵝", creative: "彩帶形成笑臉" }, async (input) => { calls.push(input); return { url: "https://generated.test/lottery.png" }; });
    expect(result.url).toBe("https://generated.test/lottery.png");
    expect(calls[0]?.originalImages).toBeUndefined();
  });
  it("builds an image-edit prompt that preserves the supplied character", () => {
    const prompt = buildRandomStickerPrompt("趴下睡覺");

    expect(prompt).toContain("exact character and style shown in the provided reference images");
    expect(prompt).toContain("Preserve the character's identity");
    expect(prompt).toContain("趴下睡覺");
    expect(prompt).toContain("Do not replace the character with a generic illustration");
  });

  it("passes different character photos to the generator and returns each generated URL", async () => {
    const received: Array<{ prompt: string; b64Json?: string }> = [];
    const fakeGenerator = async (input: { prompt: string; originalImages?: Array<{ b64Json?: string; mimeType?: string }> }) => {
      received.push({ prompt: input.prompt, b64Json: input.originalImages?.[0]?.b64Json });
      return { url: `https://generated.test/${received.length}.png` };
    };

    const rabbit = await generateRandomSticker({ prompt: "趴下睡覺", originalImage: { b64Json: "rabbit-image-data-1234567890", mimeType: "image/png" } }, fakeGenerator);
    const dog = await generateRandomSticker({ prompt: "開心跳起來", originalImage: { b64Json: "dog-image-data-1234567890", mimeType: "image/jpeg" } }, fakeGenerator);
    const mouse = await generateRandomSticker({ prompt: "探頭打招呼", originalImage: { b64Json: "mouse-image-data-1234567890", mimeType: "image/png" } }, fakeGenerator);

    expect([rabbit.url, dog.url, mouse.url]).toEqual([
      "https://generated.test/1.png",
      "https://generated.test/2.png",
      "https://generated.test/3.png",
    ]);
    expect(received.map((item) => item.b64Json)).toEqual(["rabbit-image-data-1234567890", "dog-image-data-1234567890", "mouse-image-data-1234567890"]);
    expect(received[0]?.prompt).toContain("趴下睡覺");
    expect(received[1]?.prompt).toContain("開心跳起來");
    expect(received[2]?.prompt).toContain("探頭打招呼");
  });

  it("prioritizes a supplied multi-reference set for consistent generation", async () => {
    const received: Array<{ originalImages?: Array<{ b64Json?: string }> }> = [];
    await generateRandomSticker({
      prompt: "閉眼揮手說早安",
      referenceImages: [
        { b64Json: "rabbit-primary-reference-123456", mimeType: "image/png" },
        { b64Json: "rabbit-accepted-style-123456", mimeType: "image/png" },
      ],
    }, async (input) => {
      received.push(input);
      return { url: "https://generated.test/consistent.png" };
    });
    expect(received[0]?.originalImages?.map((image) => image.b64Json)).toEqual([
      "rabbit-primary-reference-123456",
      "rabbit-accepted-style-123456",
    ]);
  });

  it("validates lottery concept fields", () => {
    expect(() => lotteryStickerInput.parse({ text: "", action: "動作", character: "角色", creative: "創意" })).toThrow();
    expect(lotteryStickerInput.parse({ text: "早安", action: "揮手", character: "小兔子", creative: "暖色手繪" })).toEqual({ text: "早安", action: "揮手", character: "小兔子", creative: "暖色手繪" });
  });

  it("surfaces generator failures and rejects empty or underspecified inputs", async () => {
    await expect(generateRandomSticker({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } }, async () => { throw new Error("service unavailable"); })).rejects.toThrow("service unavailable");
    resetImageProviderHealth();
    await expect(generateRandomSticker({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } }, async () => ({ url: undefined }))).rejects.toThrow("no image URL");
    expect(() => randomStickerInput.parse({ prompt: "", originalImage: { b64Json: "abc", mimeType: "image/png" } })).toThrow();
    expect(() => randomStickerInput.parse({ prompt: "早安", originalImage: { b64Json: "short", mimeType: "image/png" } })).toThrow();
    expect(() => randomStickerInput.parse({ prompt: "早安" })).toThrow();
    expect(randomStickerInput.parse({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } })).toEqual({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } });
  });
});
