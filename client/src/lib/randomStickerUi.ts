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

export function randomGenerationError() {
  return {
    title: "AI 隨機生成失敗",
    description: "照片已送出但生成服務沒有完成，請稍後再試。",
  };
}
