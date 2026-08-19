export type ChatLearningIdea = {
  sourceMode: "agent" | "manual";
  text: string;
  action: string;
  creative: string;
};

export function buildLearningChatState(input: {
  authenticated: boolean;
  enabled: boolean;
  ideas: ChatLearningIdea[];
}) {
  const learnedIdeas = input.authenticated && input.enabled ? input.ideas.slice(0, 8) : [];
  return {
    learnedIdeas,
    canUseLearning: input.authenticated && input.enabled,
    badge: !input.authenticated ? "登入後啟用創作學習" : input.enabled ? `AI 學習中 · ${input.ideas.length} 組` : "AI 學習已暫停",
    controlLabel: !input.authenticated ? "登入啟用學習" : input.enabled ? "暫停學習" : "開啟學習",
  };
}
