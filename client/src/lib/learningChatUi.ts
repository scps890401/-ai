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
  const learnedIdeas = input.enabled ? input.ideas.slice(0, 8) : [];
  const countLabel = learnedIdeas.length ? ` · ${learnedIdeas.length} 組` : "";
  return {
    learnedIdeas,
    canUseLearning: input.enabled,
    badge: input.enabled ? `AI 創作學習中${countLabel}` : "AI 創作學習已暫停",
    controlLabel: input.enabled ? "暫停學習" : "開啟學習",
    isAnonymous: !input.authenticated,
  };
}
