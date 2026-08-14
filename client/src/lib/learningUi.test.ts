import { describe, expect, it } from "vitest";
import { buildLearningPayload, shouldSaveLearning } from "./learningUi";

describe("learning UI helpers", () => {
  it("builds agent and manual payloads from successful creations", () => {
    expect(buildLearningPayload("agent", " 真棒 ", " 握拳歡呼 ", "鼓勵"))
      .toEqual({ sourceMode: "agent", text: "真棒", action: "握拳歡呼", creative: "鼓勵" });
    expect(buildLearningPayload("manual", "好餓", "抱著肚子", "老鼠對話框"))
      .toMatchObject({ sourceMode: "manual", text: "好餓", action: "抱著肚子" });
  });

  it("does not save while learning is paused or user is not authenticated", () => {
    expect(shouldSaveLearning(false, true)).toBe(false);
    expect(shouldSaveLearning(true, false)).toBe(false);
    expect(shouldSaveLearning(true, true)).toBe(true);
    expect(buildLearningPayload("agent", "", "動作")).toBeNull();
  });
});
