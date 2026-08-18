import { describe, expect, it } from "vitest";
import { applyStickerChatPlan, buildTextRevisionPrompt, isNoIdeaRequest, isRevisionRequest, isStickerCreationRequest, isTextRevisionRequest, normalizeStickerChatPlan, resolveStickerChatAction } from "./stickerChatFlow";

describe("sticker chat flow", () => {
  it("recognizes common sticker creation language", () => {
    expect(isStickerCreationRequest("我想做 LINE 貼圖")).toBe(true);
    expect(isStickerCreationRequest("幫我做一張角色圖")).toBe(true);
    expect(isStickerCreationRequest("今天天氣如何")).toBe(false);
  });

  it("recognizes no-idea and revision language", () => {
    expect(isNoIdeaRequest("我沒有想法，幫我抽一張")).toBe(true);
    expect(isNoIdeaRequest("你決定就好")).toBe(true);
    expect(isRevisionRequest("文字改成早安，表情更可愛")).toBe(true);
    expect(isTextRevisionRequest("把對話框文字改成早安")).toBe(true);
    expect(buildTextRevisionPrompt("把對話框文字改成早安")).toEqual({ prompt: "保留角色外觀、動作與構圖，只將貼圖文字修改為：把對話框文字改成早安", action: "只修改文字內容，保留角色與畫面：把對話框文字改成早安" });
    expect(isRevisionRequest("我想製作一張兔子貼圖")).toBe(false);
  });

  it("applies agent, random, and manual plans to the composer", () => {
    const agent = normalizeStickerChatPlan({ mode: "agent", intent: "agent", readyToGenerate: true, prompt: "狗狗揮手說早安", reply: "開始製作" });
    const random = normalizeStickerChatPlan({ mode: "random", intent: "random", readyToGenerate: true, prompt: "保留角色外觀並安排驚喜動作", reply: "開始隨機發想" });
    const manual = normalizeStickerChatPlan({ mode: "manual", intent: "manual", readyToGenerate: true, text: "好餓", reply: "建立對話框" });
    expect(applyStickerChatPlan(agent, 2)).toEqual({ mode: "agent", prompt: "狗狗揮手說早安", imagePrompts: ["狗狗揮手說早安", "狗狗揮手說早安"] });
    expect(applyStickerChatPlan(random, 1)?.mode).toBe("random");
    expect(applyStickerChatPlan(manual, 1)).toEqual({ mode: "manual", prompt: "好餓", imagePrompts: ["好餓"] });
  });

  it("does not trigger generation before a mode and prompt are ready", () => {
    const plan = normalizeStickerChatPlan({ intent: "sticker", shouldAskChoice: true, readyToGenerate: false, reply: "你想隨機還是描述？" });
    expect(applyStickerChatPlan(plan, 1)).toBeNull();
    expect(resolveStickerChatAction(plan, 1, 1)).toEqual({ draft: null, shouldGenerate: false, needsUpload: false, shouldDrawLottery: false, shouldRefineLatest: false });
  });

  it("supports lottery and latest-result refinement decisions", () => {
    const lottery = normalizeStickerChatPlan({ intent: "lottery", readyToGenerate: true, useLottery: true, reply: "我先抽一組靈感。" });
    expect(resolveStickerChatAction(lottery, 1, 0).shouldDrawLottery).toBe(true);
    const refine = normalizeStickerChatPlan({ intent: "refine", mode: "agent", readyToGenerate: true, useLatestResult: true, prompt: "把表情改得更可愛", reply: "我沿用上一張修改。" });
    expect(resolveStickerChatAction(refine, 1, 0).shouldRefineLatest).toBe(true);
  });

  it("matches Home chat integration paths", () => {
    const ready = normalizeStickerChatPlan({ intent: "agent", mode: "agent", readyToGenerate: true, prompt: "狗狗說早安", reply: "開始製作" });
    const noUpload = resolveStickerChatAction(ready, 1, 0);
    const withUpload = resolveStickerChatAction(ready, 1, 1);
    expect(noUpload.shouldGenerate).toBe(false);
    expect(noUpload.needsUpload).toBe(true);
    expect(withUpload.shouldGenerate).toBe(true);
    expect(withUpload.draft?.mode).toBe("agent");
    expect(withUpload.draft?.prompt).toBe("狗狗說早安");
  });
});
