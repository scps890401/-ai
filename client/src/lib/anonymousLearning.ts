import type { LearningPayload } from "./learningUi";

export const ANONYMOUS_LEARNING_KEY = "sticker-muse-anonymous-learning";
export const ANONYMOUS_LEARNING_LIMIT = 8;

export type AnonymousLearningIdea = LearningPayload;

function isIdea(value: unknown): value is AnonymousLearningIdea {
  if (!value || typeof value !== "object") return false;
  const idea = value as Partial<AnonymousLearningIdea>;
  return (idea.sourceMode === "agent" || idea.sourceMode === "manual")
    && typeof idea.text === "string" && typeof idea.action === "string" && typeof idea.creative === "string";
}

export function readAnonymousLearning(storage: Pick<Storage, "getItem"> | null): AnonymousLearningIdea[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(ANONYMOUS_LEARNING_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isIdea).slice(0, ANONYMOUS_LEARNING_LIMIT) : [];
  } catch {
    return [];
  }
}

export function rememberAnonymousLearning(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  idea: AnonymousLearningIdea,
): AnonymousLearningIdea[] {
  if (!storage) return [];
  const current = readAnonymousLearning(storage);
  const key = `${idea.sourceMode}|${idea.text.trim().toLocaleLowerCase()}|${idea.action.trim().toLocaleLowerCase()}|${idea.creative.trim().toLocaleLowerCase()}`;
  const next = [idea, ...current.filter((item) => `${item.sourceMode}|${item.text.trim().toLocaleLowerCase()}|${item.action.trim().toLocaleLowerCase()}|${item.creative.trim().toLocaleLowerCase()}` !== key)].slice(0, ANONYMOUS_LEARNING_LIMIT);
  storage.setItem(ANONYMOUS_LEARNING_KEY, JSON.stringify(next));
  return next;
}

export function clearAnonymousLearning(storage: Pick<Storage, "removeItem"> | null) {
  storage?.removeItem(ANONYMOUS_LEARNING_KEY);
}
