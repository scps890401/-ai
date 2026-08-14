import { describe, expect, it } from "vitest";
import { LOTTERY_CONCEPTS, pickLotteryConcept } from "./lotteryConcepts";

describe("sticker lottery concepts", () => {
  it("contains at least 100 original concepts with text, action and character", () => {
    expect(LOTTERY_CONCEPTS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(LOTTERY_CONCEPTS.map((concept) => concept.id)).size).toBe(LOTTERY_CONCEPTS.length);
    expect(LOTTERY_CONCEPTS.every((concept) => concept.text && concept.action && concept.character && concept.creative)).toBe(true);
  });

  it("avoids recent lottery results when fresh concepts exist", () => {
    const first = pickLotteryConcept([], () => 0);
    const second = pickLotteryConcept([first.id], () => 0);
    expect(second.id).not.toBe(first.id);
  });
});
