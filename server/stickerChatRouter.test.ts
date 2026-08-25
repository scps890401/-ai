import { describe, expect, it } from "vitest";
import { stickerChatInput, stickerChatPlanSchema } from "./stickerChatRouter";

describe("sticker chat router contracts", () => {
  it("accepts a bounded user and assistant conversation", () => {
    const parsed = stickerChatInput.parse({
      uploadedCount: 1,
      attachmentNames: ["dog.png"],
      hasGeneratedResult: true,
      latestGeneratedLabel: "狗狗／真棒",
      messages: [
        { role: "user", content: "我想做 LINE 貼圖" },
        { role: "assistant", content: "你想隨機還是描述？" },
      ],
    });
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.uploadedCount).toBe(1);
    expect(parsed.attachmentNames).toEqual(["dog.png"]);
    expect(parsed.hasGeneratedResult).toBe(true);
    expect(parsed.learnedIdeas).toEqual([]);
  });

  it("accepts bounded creative learning samples for chat context", () => {
    const parsed = stickerChatInput.parse({
      messages: [{ role: "user", content: "幫我想一張貼圖" }],
      learnedIdeas: [{ sourceMode: "agent", text: "今天也很棒", action: "角色揮手並露出笑容", creative: "暖色手繪感" }],
    });
    expect(parsed.learnedIdeas).toEqual([{ sourceMode: "agent", text: "今天也很棒", action: "角色揮手並露出笑容", creative: "暖色手繪感" }]);
  });

  it("rejects unsupported roles and malformed plans", () => {
    expect(() => stickerChatInput.parse({ messages: [{ role: "system", content: "bad" }] })).toThrow();
    expect(() => stickerChatPlanSchema.parse({ intent: "agent", reply: "開始" })).toThrow();
  });

  it("accepts lottery and refinement plans", () => {
    const lottery = stickerChatPlanSchema.parse({ intent: "lottery", reply: "我先抽一組靈感。", shouldAskChoice: false, readyToGenerate: true, mode: null, prompt: "", action: "", text: "", creative: "", useLottery: true, useLatestResult: false });
    const refine = stickerChatPlanSchema.parse({ intent: "refine", reply: "我沿用上一張修改。", shouldAskChoice: false, readyToGenerate: true, mode: "agent", prompt: "把表情改得更可愛", action: "表情更可愛", text: "", creative: "", useLottery: false, useLatestResult: true });
    expect(lottery.useLottery).toBe(true);
    expect(refine.useLatestResult).toBe(true);
  });

  it("accepts a structured pack plan with character and target-position data", () => {
    const plan = stickerChatPlanSchema.parse({
      intent: "agent",
      projectAction: "create",
      reply: "我會先規劃 8 張，再逐張製作。",
      shouldAskChoice: false,
      needsClarification: false,
      readyToGenerate: true,
      mode: "agent",
      packSize: 8,
      language: "zh-Hant",
      style: "溫暖手繪、白邊貼圖",
      characterUpdate: { species: "兔子", appearance: "黑白毛色與長耳朵", clothing: "無", accessories: "粉紅牽繩", styleAnchors: "圓潤可愛", preserve: ["黑白臉部花紋"], negative: ["不要多出肢體"] },
      targetPositions: [3],
      planItems: [{ position: 1, text: "早安", action: "揮手", emotion: "開心", composition: "角色置中", prompt: "兔子揮手", sourceIndex: 0 }],
      prompt: "保留兔子外觀製作可愛貼圖",
      action: "揮手",
      text: "早安",
      creative: "溫暖手繪",
      useLottery: false,
      useLatestResult: false,
    });
    expect(plan.packSize).toBe(8);
    expect(plan.characterUpdate?.species).toBe("兔子");
    expect(plan.planItems[0]?.position).toBe(1);
    expect(plan.targetPositions).toEqual([3]);
  });

  it("accepts a complete ready-to-generate agent plan", () => {
    const plan = stickerChatPlanSchema.parse({
      intent: "agent",
      reply: "我會開始製作。",
      shouldAskChoice: false,
      readyToGenerate: true,
      mode: "agent",
      prompt: "保留狗狗外觀並揮手說早安",
      action: "角色揮手並說早安",
      text: "早安",
      creative: "清楚輪廓與白色貼圖邊框",
    });
    expect(plan.readyToGenerate).toBe(true);
    expect(plan.mode).toBe("agent");
  });
});
