import { describe, expect, it } from "vitest";
import { resolveLotteryChatPresentation } from "./lotteryChatUi";

describe("lottery chat presentation", () => {
  it("shows the shared lottery concept card before image generation", () => {
    expect(resolveLotteryChatPresentation({ visible: true, hasConcept: true, hasImage: false })).toEqual({
      showCard: true,
      canDrawAgain: true,
      canGenerate: true,
      canUseInAgent: false,
    });
  });

  it("offers agent handoff after the lottery image exists", () => {
    expect(resolveLotteryChatPresentation({ visible: true, hasConcept: true, hasImage: true }).canUseInAgent).toBe(true);
    expect(resolveLotteryChatPresentation({ visible: true, hasConcept: true, hasImage: true }).canGenerate).toBe(false);
  });

  it("does not render an incomplete lottery card", () => {
    expect(resolveLotteryChatPresentation({ visible: false, hasConcept: true, hasImage: false }).showCard).toBe(false);
    expect(resolveLotteryChatPresentation({ visible: true, hasConcept: false, hasImage: false }).showCard).toBe(false);
  });
});
