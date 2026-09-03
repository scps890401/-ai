import { describe, expect, it } from "vitest";
import type { CharacterProfile, StickerTextLayer } from "./chat";

describe("Phase 2.5 data contracts", () => {
  it("round-trips a CharacterProfile as JSON without losing anchors", () => {
    const profile: CharacterProfile = {
      visual_anchor: "small cream rabbit with one bent ear",
      key_features: ["bent left ear", "round cheeks"],
      color_palette: ["cream", "coral"],
      art_style: "minimal soft watercolor",
      signature_items: ["blue scarf"],
      negative_prompt: ["photorealistic", "extra limbs"],
    };

    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });

  it("round-trips StickerTextLayer separately from image content", () => {
    const layer: StickerTextLayer = {
      text: "早安",
      fontFamily: "Noto Sans TC",
      fontSize: 48,
      fontWeight: 700,
      strokeWidth: 4,
      position: { x: 0.5, y: 0.82 },
      alignment: "center",
      rotation: 0,
    };

    expect(JSON.parse(JSON.stringify([layer]))).toEqual([layer]);
    expect(layer.text).toBe("早安");
  });
});
