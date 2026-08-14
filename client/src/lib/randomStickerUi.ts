export type RandomStickerCard = {
  src: string;
  label: string;
  color: string;
};

export function addRandomSticker(current: RandomStickerCard[], result: { url: string; label: string }, packSize: number) {
  return [{ src: result.url, label: result.label, color: "gold" }, ...current].slice(0, packSize);
}

export function randomGenerationError() {
  return {
    title: "AI 隨機生成失敗",
    description: "照片已送出但生成服務沒有完成，請稍後再試。",
  };
}
