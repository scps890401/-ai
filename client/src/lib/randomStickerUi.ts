export type RandomStickerCard = {
  src: string;
  label: string;
  color: string;
  source?: string;
  action?: string;
};

export function addRandomSticker(current: RandomStickerCard[], result: { url: string; label: string; source: string; action: string }, packSize: number) {
  return [{ src: result.url, label: result.label, color: "gold", source: result.source, action: result.action }, ...current].slice(0, packSize);
}

export function replaceStickerAt(current: RandomStickerCard[], index: number, result: { url: string }) {
  return current.map((sticker, stickerIndex) => stickerIndex === index ? { ...sticker, src: result.url } : sticker);
}

export function randomGenerationError(sourceCount = 1, error?: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const exhausted = /usage exhausted|failed_precondition|quota|rate limit|insufficient/i.test(message);
  return {
    title: exhausted ? "AI 影像服務暫時無法生成" : "AI 隨機生成失敗",
    description: exhausted
      ? `目前影像生成額度已用完，${sourceCount} 張素材尚未產生新貼圖；請稍後再試。`
      : `已處理 ${sourceCount} 張素材，但生成服務沒有完成，請稍後再試。`,
  };
}
