import { describe, expect, it } from "vitest";
import { shouldOpenFeedbackFromHash, validateFeedbackMessage } from "./feedbackUi";

describe("feedback UI helpers", () => {
  it("opens the feedback modal from the shareable hash", () => {
    expect(shouldOpenFeedbackFromHash("#feedback")).toBe(true);
    expect(shouldOpenFeedbackFromHash("")).toBe(false);
    expect(shouldOpenFeedbackFromHash("#other")).toBe(false);
  });

  it("validates the message length before submit", () => {
    expect(validateFeedbackMessage("希望增加風格")).toBe(true);
    expect(validateFeedbackMessage("太短")).toBe(false);
    expect(validateFeedbackMessage("a".repeat(2001))).toBe(false);
  });
});
