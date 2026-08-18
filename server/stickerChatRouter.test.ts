import { describe, expect, it } from "vitest";
import { stickerChatInput, stickerChatPlanSchema } from "./stickerChatRouter";

describe("sticker chat router contracts", () => {
  it("accepts a bounded user and assistant conversation", () => {
    const parsed = stickerChatInput.parse({
      uploadedCount: 1,
      messages: [
        { role: "user", content: "我想做 LINE 貼圖" },
        { role: "assistant", content: "你想隨機還是描述？" },
      ],
    });
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.uploadedCount).toBe(1);
  });

  it("rejects unsupported roles and malformed plans", () => {
    expect(() => stickerChatInput.parse({ messages: [{ role: "system", content: "bad" }] })).toThrow();
    expect(() => stickerChatPlanSchema.parse({ intent: "agent", reply: "開始" })).toThrow();
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
