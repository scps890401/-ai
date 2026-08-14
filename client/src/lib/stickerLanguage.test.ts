import { describe, expect, it } from "vitest";
import { STICKER_SCENARIOS, pickRandomStickerConcept } from "./stickerLanguage";

describe("sticker language variety", () => {
  it("contains multiple practical LINE sticker scenarios", () => {
    expect(STICKER_SCENARIOS.length).toBeGreaterThanOrEqual(8);
    expect(STICKER_SCENARIOS.map((scenario) => scenario.key)).toEqual(expect.arrayContaining(["greeting", "reply", "emotion", "life", "work", "comfort"]));
  });

  it("pairs a phrase with a compatible action and avoids recent scenarios", () => {
    const concept = pickRandomStickerConcept(["greeting", "reply", "thanks", "cheer", "emotion", "life", "work", "comfort"], () => 0);

    expect(concept.scenario).toBe("可愛俏皮");
    expect(concept.text).toBeTruthy();
    expect(concept.action).toBeTruthy();
    expect(concept.key).toContain("cute:");
    expect(concept.scenarioKey).toBe("cute");
  });

  it("prevents the same scenario from repeating immediately for one character", () => {
    const first = pickRandomStickerConcept([], () => 0);
    const second = pickRandomStickerConcept([first.scenarioKey], () => 0);

    expect(second.scenarioKey).not.toBe(first.scenarioKey);
    expect(second.key).not.toBe(first.key);
  });

  it("can sample a learned creator concept and cool it down", () => {
    const learned = { key: "learned:1", scenarioKey: "learned:1", scenario: "你的創作", text: "狗狗加油", action: "舉起加油牌" };
    const selected = pickRandomStickerConcept([], () => 0, [learned]);
    expect(selected).toEqual(learned);
    const fallback = pickRandomStickerConcept([learned.scenarioKey], () => 0, [learned]);
    expect(fallback.scenarioKey).not.toBe(learned.scenarioKey);
  });

  it("allows deterministic selection for reliable tests and diverse UI previews", () => {
    const first = pickRandomStickerConcept([], () => 0);
    const second = pickRandomStickerConcept([], () => 0.8);

    expect(first.key).not.toBe(second.key);
    expect(first.text).not.toBe("");
    expect(second.action).not.toBe("");
  });
});
