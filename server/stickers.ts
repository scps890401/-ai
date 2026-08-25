import { z } from "zod";
import { generateImage } from "./_core/imageGeneration";
import { publicProcedure, router } from "./_core/trpc";

export const lotteryStickerInput = z.object({
  text: z.string().min(1).max(255),
  action: z.string().min(1).max(255),
  character: z.string().min(1).max(255),
  creative: z.string().min(1).max(500),
});

export const randomStickerInput = z.object({
  prompt: z.string().min(1).max(500),
  originalImage: z.object({
    b64Json: z.string().min(20),
    mimeType: z.string().min(3),
  }),
});

export function buildLotteryStickerPrompt(input: z.infer<typeof lotteryStickerInput>) {
  return `Create one original LINE sticker with no reference photo. Main character: ${input.character}. Spoken text in Traditional Chinese: 「${input.text}」. Pose and action: ${input.action}. Visual idea: ${input.creative}. Warm hand-drawn illustration, clear expressive silhouette, balanced sticker composition, leave a clean uncluttered area for the app to typeset Traditional Chinese, do not render words or letters inside the image, transparent background, no watermark, no brand logos, no extra characters, no unrelated objects.`;
}

export function buildRandomStickerPrompt(prompt: string) {
  return `Create a LINE sticker based on the exact character shown in the provided reference photo. Preserve the character's identity, species, colors, markings, face, proportions, and recognizable appearance. Do not replace the character with a generic illustration and do not create a text-only variation. Show the same character naturally performing this action or expression: ${prompt}. Clean sticker composition, expressive pose, leave a clean uncluttered area for the app to typeset Traditional Chinese, do not render words or letters inside the image, transparent background, no extra characters, no watermark, no unrelated objects.`;
}

type ImageGenerator = typeof generateImage;

export async function generateLotterySticker(input: z.infer<typeof lotteryStickerInput>, imageGenerator: ImageGenerator = generateImage) {
  const result = await imageGenerator({ prompt: buildLotteryStickerPrompt(input) });
  if (!result.url) throw new Error("AI image generation returned no image URL");
  return { url: result.url };
}

export async function generateRandomSticker(input: z.infer<typeof randomStickerInput>, imageGenerator: ImageGenerator = generateImage) {
  const result = await imageGenerator({
    prompt: buildRandomStickerPrompt(input.prompt),
    originalImages: [input.originalImage],
  });

  if (!result.url) throw new Error("AI image generation returned no image URL");
  return { url: result.url };
}

export const stickerRouter = router({
  randomGenerate: publicProcedure.input(randomStickerInput).mutation(({ input }) => generateRandomSticker(input)),
  lotteryGenerate: publicProcedure.input(lotteryStickerInput).mutation(({ input }) => generateLotterySticker(input)),
});
