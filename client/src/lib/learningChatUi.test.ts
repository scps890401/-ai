import { describe, expect, it } from "vitest";
import { buildLearningChatState } from "./learningChatUi";

const ideas = Array.from({ length: 10 }, (_, index) => ({
  sourceMode: "agent" as const,
  text: `文字 ${index}`,
  action: `動作 ${index}`,
  creative: `創意 ${index}`,
}));

describe("learning chat state", () => {
  it("passes only the latest eight ideas when learning is enabled", () => {
    const state = buildLearningChatState({ authenticated: true, enabled: true, ideas });
    expect(state.learnedIdeas).toHaveLength(8);
    expect(state.badge).toBe("AI 學習中 · 10 組");
    expect(state.controlLabel).toBe("暫停學習");
  });

  it("stops sending learning context while paused", () => {
    const state = buildLearningChatState({ authenticated: true, enabled: false, ideas });
    expect(state.learnedIdeas).toEqual([]);
    expect(state.canUseLearning).toBe(false);
    expect(state.controlLabel).toBe("開啟學習");
  });

  it("offers login instead of exposing private learning data to guests", () => {
    const state = buildLearningChatState({ authenticated: false, enabled: true, ideas });
    expect(state.learnedIdeas).toEqual([]);
    expect(state.badge).toBe("登入後啟用創作學習");
    expect(state.controlLabel).toBe("登入啟用學習");
  });
});
