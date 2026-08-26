import type { RandomStickerCard } from "./randomStickerUi";

export type RandomInput = { b64Json: string; mimeType: string };
export type RandomGenerationInput = { prompt: string; originalImage: RandomInput; referenceImages?: RandomInput[] };
export type RandomGenerationResult = { url: string; provider?: string; model?: string; selectedReason?: string; attempts?: Array<{ provider: string; model: string; reason: string; errorKind?: string; message?: string }> };
export type RandomGenerator = (input: RandomGenerationInput) => Promise<RandomGenerationResult>;

export async function regenerateSingleSticker(
  sticker: RandomStickerCard,
  toImageInput: (source: string) => Promise<RandomInput>,
  generator: RandomGenerator,
  wait?: (milliseconds: number) => Promise<void>,
  referenceImages?: RandomInput[],
) {
  if (!sticker.source || !sticker.action) throw new Error("Sticker has no random source");
  const originalImage = await toImageInput(sticker.source);
  const references = referenceImages?.length ? referenceImages : [originalImage];
  const result = await generateWithRetry(generator, { prompt: sticker.action, originalImage: references[0]!, referenceImages: references }, 3, wait);
  return { ...sticker, src: result.url };
}

export function isNonRetryableGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /usage exhausted|failed_precondition|quota|rate limit|insufficient/i.test(message);
}

export async function generateWithRetry(
  generator: RandomGenerator,
  input: RandomGenerationInput,
  maxAttempts = 3,
  wait: (milliseconds: number) => Promise<void> = async () => undefined,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generator(input);
    } catch (error) {
      lastError = error;
      if (isNonRetryableGenerationError(error)) break;
      if (attempt < maxAttempts) await wait(350 * attempt);
    }
  }
  throw lastError ?? new Error("AI generation failed after retries");
}
