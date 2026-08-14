import { describe, expect, it } from "vitest";
import { buildRandomStickerPrompt, generateRandomSticker, randomStickerInput } from "./stickers";

describe("random sticker generation", () => {
  it("builds an image-edit prompt that preserves the supplied character", () => {
    const prompt = buildRandomStickerPrompt("趴下睡覺");

    expect(prompt).toContain("exact character shown in the provided reference photo");
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

  it("surfaces generator failures and rejects empty or underspecified inputs", async () => {
    await expect(generateRandomSticker({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } }, async () => { throw new Error("service unavailable"); })).rejects.toThrow("service unavailable");
    await expect(generateRandomSticker({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } }, async () => ({ url: undefined }))).rejects.toThrow("no image URL");
    expect(() => randomStickerInput.parse({ prompt: "", originalImage: { b64Json: "abc", mimeType: "image/png" } })).toThrow();
    expect(() => randomStickerInput.parse({ prompt: "早安", originalImage: { b64Json: "short", mimeType: "image/png" } })).toThrow();
    expect(randomStickerInput.parse({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } })).toEqual({ prompt: "早安", originalImage: { b64Json: "a".repeat(24), mimeType: "image/png" } });
  });
});
