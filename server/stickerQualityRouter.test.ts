import { describe, expect, it } from "vitest";
import { deterministicStickerQuality } from "./stickerQualityRouter";

describe("deterministic sticker quality gate", () => {
  it("requires PNG and rejects files over the LINE single-file budget before a paid vision check", () => {
    const quality = deterministicStickerQuality({ mimeType: "image/jpeg", sizeBytes: 1_100_000 }, "早安");
    expect(quality.decision).toBe("retry");
    expect(quality.issues).toHaveLength(2);
  });

  it("passes an eligible image to the semantic review stage", () => {
    const quality = deterministicStickerQuality({ mimeType: "image/png", sizeBytes: 500_000 });
    expect(quality.decision).toBe("review");
  });
});
