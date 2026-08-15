export function shouldOpenFeedbackFromHash(hash: string) {
  return hash === "#feedback";
}

export function validateFeedbackMessage(message: string) {
  return message.trim().length >= 5 && message.trim().length <= 2000;
}

export function getFeedbackVoterToken(storage: Pick<Storage, "getItem" | "setItem"> | null, createToken = () => crypto.randomUUID()) {
  const key = "sticker-muse-feedback-voter";
  const existing = storage?.getItem(key);
  if (existing) return existing;
  const token = createToken();
  storage?.setItem(key, token);
  return token;
}

export type FeedbackSortOption = "latest" | "popular";

export function setFeedbackSort(current: FeedbackSortOption, next: string): FeedbackSortOption {
  return next === "popular" ? "popular" : next === "latest" ? "latest" : current;
}

export function applyFeedbackVote<T extends { id: number; upvotes: number }>(items: T[], id: number, added: boolean) {
  if (!added) return items;
  return items.map((item) => item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item);
}

export function getFeedbackStatusLabel(status: "new" | "reviewing" | "resolved") {
  return status === "reviewing" ? "處理中" : status === "resolved" ? "已完成" : "待處理";
}

export function getPublicFeedbackViewState(input: { isLoading: boolean; isError: boolean; count: number }) {
  if (input.isLoading) return "loading" as const;
  if (input.isError) return "error" as const;
  if (input.count === 0) return "empty" as const;
  return "ready" as const;
}
