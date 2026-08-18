import { describe, expect, it } from "vitest";
import { applyRabbitExampleToComposer, buildRabbitExampleDraft, rabbitExampleToStickerConcept, RABBIT_EXAMPLES } from "./rabbitExamples";

describe("rabbit reference examples", () => {
  it("contains nine standalone examples with images and prompts", () => {
    expect(RABBIT_EXAMPLES).toHaveLength(9);
    for (const example of RABBIT_EXAMPLES) {
      expect(example.src).toMatch(/^\/manus-storage\/rabbit-sticker-\d{2}_/);
      expect(example.text.length).toBeGreaterThan(0);
      expect(example.action.length).toBeGreaterThan(5);
      expect(example.elements.length).toBeGreaterThanOrEqual(2);
      expect(example.prompt).toContain(example.text);
    }
  });

  it("builds an agent draft and a random concept from the selected reference", () => {
    const example = RABBIT_EXAMPLES[0];
    const draft = buildRabbitExampleDraft(example);
    const concept = rabbitExampleToStickerConcept(example);
    expect(draft).toEqual({ mode: "agent", prompt: example.prompt, imagePrompts: [example.prompt] });
    expect(draft.mode).toBe("agent");
    expect(draft.imagePrompts).toEqual([draft.prompt]);
    expect(applyRabbitExampleToComposer(["舊提示 A", "舊提示 B"], example)).toEqual({ mode: "agent", prompt: example.prompt, imagePrompts: [example.prompt, example.prompt] });
    expect(concept.text).toBe(example.text);
    expect(concept.action).toBe(example.action);
    expect(concept.scenario).toBe("兔子日常參考");
  });

  it("keeps the two repeated 開動囉 examples as distinct action references", () => {
    const mealExamples = RABBIT_EXAMPLES.filter((example) => example.text === "開動囉");
    expect(mealExamples).toHaveLength(2);
    expect(mealExamples[0].action).not.toBe(mealExamples[1].action);
  });
});
