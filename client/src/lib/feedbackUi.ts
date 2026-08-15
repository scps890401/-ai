export function shouldOpenFeedbackFromHash(hash: string) {
  return hash === "#feedback";
}

export function validateFeedbackMessage(message: string) {
  return message.trim().length >= 5 && message.trim().length <= 2000;
}

export function getPublicFeedbackViewState(input: { isLoading: boolean; isError: boolean; count: number }) {
  if (input.isLoading) return "loading" as const;
  if (input.isError) return "error" as const;
  if (input.count === 0) return "empty" as const;
  return "ready" as const;
}
