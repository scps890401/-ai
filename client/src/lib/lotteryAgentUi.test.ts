import { describe, expect, it } from "vitest";
import { buildLotteryAgentDraft, buildLotteryAgentState } from "./lotteryAgentUi";

const concept = { id: "lottery-001", category: "問候", text: "早安，今天也要亮晶晶", action: "從棉被探出頭伸懶腰", character: "圓滾滾的小兔子", creative: "晨光與吐司" };

describe("lottery to agent flow", () => {
  it("maps the lottery result into uploaded, prompt and imagePrompts state", () => {
    const state = buildLotteryAgentState(concept, "https://generated.test/lottery.png");
    expect(state.uploaded).toEqual(["https://generated.test/lottery.png"]);
    expect(state.prompt).toBe(concept.text);
    expect(state.imagePrompts[0]).toContain(concept.text);
    expect(state.imagePrompts[0]).toContain(concept.action);
  });

  it("carries both text and action into the agent draft", () => {
    const draft = buildLotteryAgentDraft(concept, "https://generated.test/lottery.png");
    expect(draft.text).toBe(concept.text);
    expect(draft.action).toBe(concept.action);
    expect(draft.prompt).toContain(concept.text);
    expect(draft.prompt).toContain(concept.action);
    expect(draft.imageUrl).toBe("https://generated.test/lottery.png");
  });
});
