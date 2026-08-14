export type LearningMode = "agent" | "manual";

export type LearningPayload = {
  sourceMode: LearningMode;
  text: string;
  action: string;
  creative: string;
};

export function shouldSaveLearning(enabled: boolean, authenticated: boolean) {
  return enabled && authenticated;
}

export function buildLearningPayload(mode: LearningMode, text: string, action: string, creative = ""): LearningPayload | null {
  const normalizedText = text.trim();
  const normalizedAction = action.trim();
  if (!normalizedText || !normalizedAction) return null;
  return { sourceMode: mode, text: normalizedText, action: normalizedAction, creative: creative.trim() };
}
