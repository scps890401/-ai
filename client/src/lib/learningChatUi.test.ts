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
    expect(state.badge).toBe("AI 創作學習中 · 8 組");
    expect(state.controlLabel).toBe("暫停學習");
  });

  it("stops sending learning context while paused", () => {
    const state = buildLearningChatState({ authenticated: true, enabled: false, ideas });
    expect(state.learnedIdeas).toEqual([]);
    expect(state.canUseLearning).toBe(false);
    expect(state.controlLabel).toBe("開啟學習");
  });

  it("allows guests to use anonymous learning without exposing a login gate", () => {
    const state = buildLearningChatState({ authenticated: false, enabled: true, ideas });
    expect(state.learnedIdeas).toHaveLength(8);
    expect(state.canUseLearning).toBe(true);
    expect(state.badge).toBe("AI 創作學習中 · 8 組");
    expect(state.controlLabel).toBe("暫停學習");
    expect(state.isAnonymous).toBe(true);
  });

  it("keeps the status badge distinct from the single actionable control", () => {
    const state = buildLearningChatState({ authenticated: false, enabled: true, ideas: [] });
    expect(state.badge).not.toBe(state.controlLabel);
    expect([state.controlLabel]).toHaveLength(1);
  });
});
