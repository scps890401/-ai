import { describe, expect, it } from "vitest";
import { applyFeedbackVote, getFeedbackStatusLabel, getFeedbackVoterToken, getPublicFeedbackViewState, setFeedbackSort, shouldOpenFeedbackFromHash, validateFeedbackMessage } from "./feedbackUi";

describe("feedback UI helpers", () => {
  it("opens the feedback modal from the shareable hash", () => {
    expect(shouldOpenFeedbackFromHash("#feedback")).toBe(true);
    expect(shouldOpenFeedbackFromHash("")).toBe(false);
    expect(shouldOpenFeedbackFromHash("#other")).toBe(false);
  });

  it("keeps the same anonymous voter token for repeat visits", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const first = getFeedbackVoterToken(storage, () => "stable-token-123456");
    const second = getFeedbackVoterToken(storage, () => "different-token");
    expect(first).toBe("stable-token-123456");
    expect(second).toBe(first);
  });

  it("switches between latest and popular sorting and preserves valid current value", () => {
    expect(setFeedbackSort("latest", "popular")).toBe("popular");
    expect(setFeedbackSort("popular", "latest")).toBe("latest");
    expect(setFeedbackSort("latest", "unknown")).toBe("latest");
  });

  it("updates only the voted suggestion and ignores duplicate votes", () => {
    const items = [{ id: 1, upvotes: 2 }, { id: 2, upvotes: 4 }];
    expect(applyFeedbackVote(items, 1, true)).toEqual([{ id: 1, upvotes: 3 }, { id: 2, upvotes: 4 }]);
    expect(applyFeedbackVote(items, 1, false)).toBe(items);
  });

  it("maps progress statuses to visible labels", () => {
    expect(getFeedbackStatusLabel("new")).toBe("待處理");
    expect(getFeedbackStatusLabel("reviewing")).toBe("處理中");
    expect(getFeedbackStatusLabel("resolved")).toBe("已完成");
  });

  it("covers public wall loading, error, empty, and ready states", () => {
    expect(getPublicFeedbackViewState({ isLoading: true, isError: false, count: 0 })).toBe("loading");
    expect(getPublicFeedbackViewState({ isLoading: false, isError: true, count: 0 })).toBe("error");
    expect(getPublicFeedbackViewState({ isLoading: false, isError: false, count: 0 })).toBe("empty");
    expect(getPublicFeedbackViewState({ isLoading: false, isError: false, count: 1 })).toBe("ready");
  });

  it("validates the message length before submit", () => {
    expect(validateFeedbackMessage("希望增加風格")).toBe(true);
    expect(validateFeedbackMessage("太短")).toBe(false);
    expect(validateFeedbackMessage("a".repeat(2001))).toBe(false);
  });
});
