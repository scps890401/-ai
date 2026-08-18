export type StickerChatIntent = "general" | "sticker" | "random" | "agent" | "manual" | "lottery" | "refine";
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
  useLottery: boolean;
  useLatestResult: boolean;
};

export type StickerComposerDraft = {
  mode: StickerChatMode;
  prompt: string;
  imagePrompts: string[];
};

export function normalizeStickerChatPlan(plan: Partial<StickerChatPlan>): StickerChatPlan {
  const mode = plan.mode === "random" || plan.mode === "agent" || plan.mode === "manual" ? plan.mode : null;
  const intent = plan.intent === "random" || plan.intent === "agent" || plan.intent === "manual" || plan.intent === "sticker" || plan.intent === "lottery" || plan.intent === "refine" ? plan.intent : "general";
  const useLottery = Boolean(plan.useLottery);
  const useLatestResult = Boolean(plan.useLatestResult);
  return {
    intent,
    reply: String(plan.reply || "我可以幫你製作 LINE 貼圖。你想先隨機發想，還是描述角色與想做的內容？"),
    shouldAskChoice: Boolean(plan.shouldAskChoice),
    readyToGenerate: Boolean(plan.readyToGenerate && (mode || useLottery || useLatestResult)),
    mode,
    prompt: String(plan.prompt || "").trim(),
    action: String(plan.action || "").trim(),
    text: String(plan.text || "").trim(),
    creative: String(plan.creative || "").trim(),
    useLottery,
    useLatestResult,
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

export function isNoIdeaRequest(message: string) {
  return /(沒想法|沒有想法|沒靈感|沒有靈感|隨便|幫我想|你決定|抽一張|抽個靈感)/i.test(message);
}

export function isRevisionRequest(message: string) {
  return /(修改|改一下|改成|換成|再可愛|更可愛|更活潑|不要這樣|調整|重新做|重做)/i.test(message);
}

export function isTextRevisionRequest(message: string) {
  return /(文字|字樣|文案|對話框|說：|說「|換字|改字)/i.test(message);
}

export function buildTextRevisionPrompt(message: string) {
  const trimmed = message.trim();
  return {
    prompt: `保留角色外觀、動作與構圖，只將貼圖文字修改為：${trimmed}`,
    action: `只修改文字內容，保留角色與畫面：${trimmed}`,
  };
}

export function resolveStickerChatAction(plan: StickerChatPlan, currentPromptCount: number, uploadedCount: number) {
  const draft = applyStickerChatPlan(plan, currentPromptCount);
  return {
    draft,
    shouldGenerate: Boolean(draft && plan.readyToGenerate && uploadedCount > 0 && !plan.useLottery && !plan.useLatestResult),
    needsUpload: Boolean(draft && plan.readyToGenerate && uploadedCount === 0 && !plan.useLottery && !plan.useLatestResult),
    shouldDrawLottery: Boolean(plan.readyToGenerate && plan.useLottery),
    shouldRefineLatest: Boolean(plan.readyToGenerate && plan.useLatestResult),
  };
}
