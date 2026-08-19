export type LotteryChatPresentationInput = {
  visible: boolean;
  hasConcept: boolean;
  hasImage: boolean;
};

export function resolveLotteryChatPresentation(input: LotteryChatPresentationInput) {
  const showCard = input.visible && input.hasConcept;
  return {
    showCard,
    canDrawAgain: showCard,
    canGenerate: showCard && !input.hasImage,
    canUseInAgent: showCard && input.hasImage,
  };
}
