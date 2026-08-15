export function shouldOpenFeedbackFromHash(hash: string) {
  return hash === "#feedback";
}

export function validateFeedbackMessage(message: string) {
  return message.trim().length >= 5 && message.trim().length <= 2000;
}
