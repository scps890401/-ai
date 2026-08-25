export type RandomStickerCard = {
  src: string;
  label: string;
  color: string;
  source?: string;
  action?: string;
  assetId?: number;
};

export type StickerJobState = { position: number; status: string; errorMessage?: string };

export function updateStickerJobState(current: StickerJobState[], position: number, status: string, errorMessage?: string) {
  const next: StickerJobState = { position, status, ...(errorMessage ? { errorMessage } : {}) };
  const found = current.some((job) => job.position === position);
  return found ? current.map((job) => job.position === position ? next : job) : [...current, next];
}

export function addRandomSticker(current: RandomStickerCard[], result: { url: string; label: string; source: string; action: string; assetId?: number }, packSize: number) {
  return [{ src: result.url, label: result.label, color: "gold", source: result.source, action: result.action, ...(result.assetId !== undefined ? { assetId: result.assetId } : {}) }, ...current].slice(0, packSize);
}

export function replaceStickerAt(current: RandomStickerCard[], index: number, result: { url: string; label?: string; action?: string; source?: string; color?: string; assetId?: number | null }) {
  return current.map((sticker, stickerIndex) => stickerIndex === index ? {
    ...sticker,
    src: result.url,
    ...(result.label !== undefined ? { label: result.label } : {}),
    ...(result.action !== undefined ? { action: result.action } : {}),
    ...(result.source !== undefined ? { source: result.source } : {}),
    ...(result.color !== undefined ? { color: result.color } : {}),
    ...(result.assetId !== undefined ? { assetId: result.assetId ?? undefined } : {}),
  } : sticker);
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
