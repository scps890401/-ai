import type { LotteryConcept } from "./lotteryConcepts";

export type LotteryAgentDraft = {
  text: string;
  action: string;
  prompt: string;
  imageUrl: string;
};

export type LotteryAgentState = {
  uploaded: string[];
  prompt: string;
  imagePrompts: string[];
};

export function buildLotteryAgentState(concept: LotteryConcept, imageUrl = ""): LotteryAgentState {
  const draft = buildLotteryAgentDraft(concept, imageUrl);
  return { uploaded: draft.imageUrl ? [draft.imageUrl] : [], prompt: draft.text, imagePrompts: [draft.prompt] };
}

export function buildLotteryAgentDraft(concept: LotteryConcept, imageUrl = ""): LotteryAgentDraft {
  return {
    text: concept.text,
    action: concept.action,
    prompt: `${concept.text}；請讓角色呈現：${concept.action}`,
    imageUrl,
  };
}
