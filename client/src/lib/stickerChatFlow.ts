export type StickerChatIntent = "general" | "sticker" | "random" | "agent" | "manual";
export type StickerChatMode = "random" | "agent" | "manual";

export type StickerChatPlan = {
  intent: StickerChatIntent;
  reply: string;
  shouldAskChoice: boolean;
  readyToGenerate: boolean;
  mode: StickerChatMode | null;
  prompt: string;
  action: string;
  text: string;
  creative: string;
};

export type StickerComposerDraft = {
  mode: StickerChatMode;
  prompt: string;
  imagePrompts: string[];
};

export function normalizeStickerChatPlan(plan: Partial<StickerChatPlan>): StickerChatPlan {
  const mode = plan.mode === "random" || plan.mode === "agent" || plan.mode === "manual" ? plan.mode : null;
  const intent = plan.intent === "random" || plan.intent === "agent" || plan.intent === "manual" || plan.intent === "sticker" ? plan.intent : "general";
  return {
    intent,
    reply: String(plan.reply || "我可以幫你製作 LINE 貼圖。你想先隨機發想，還是描述角色與想做的內容？"),
    shouldAskChoice: Boolean(plan.shouldAskChoice),
    readyToGenerate: Boolean(plan.readyToGenerate && mode),
    mode,
    prompt: String(plan.prompt || "").trim(),
    action: String(plan.action || "").trim(),
    text: String(plan.text || "").trim(),
    creative: String(plan.creative || "").trim(),
  };
}

export function applyStickerChatPlan(plan: StickerChatPlan, currentPromptCount: number): StickerComposerDraft | null {
  if (!plan.mode) return null;
  const prompt = plan.mode === "manual" ? plan.text || plan.prompt : plan.prompt || plan.action || plan.text;
  if (!prompt) return null;
  return {
    mode: plan.mode,
    prompt,
    imagePrompts: Array.from({ length: Math.max(1, currentPromptCount) }, () => prompt),
  };
}

export function isStickerCreationRequest(message: string) {
  return /(貼圖|貼圖包|LINE|做一張|製作.*圖|生成.*圖)/i.test(message);
}

export function resolveStickerChatAction(plan: StickerChatPlan, currentPromptCount: number, uploadedCount: number) {
  const draft = applyStickerChatPlan(plan, currentPromptCount);
  return {
    draft,
    shouldGenerate: Boolean(draft && plan.readyToGenerate && uploadedCount > 0),
    needsUpload: Boolean(draft && plan.readyToGenerate && uploadedCount === 0),
  };
}
