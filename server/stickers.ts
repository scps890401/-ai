import { z } from "zod";
import { generateImage } from "./_core/imageGeneration";
import { publicProcedure, router } from "./_core/trpc";

export const randomStickerInput = z.object({
  prompt: z.string().min(1).max(500),
  originalImage: z.object({
    b64Json: z.string().min(20),
    mimeType: z.string().min(3),
  }),
});

export function buildRandomStickerPrompt(prompt: string) {
  return `Create a LINE sticker based on the exact character shown in the provided reference photo. Preserve the character's identity, species, colors, markings, face, proportions, and recognizable appearance. Do not replace the character with a generic illustration and do not create a text-only variation. Show the same character naturally performing this action or expression: ${prompt}. Clean sticker composition, expressive pose, transparent background, no extra characters, no watermark, no unrelated objects.`;
}

type ImageGenerator = typeof generateImage;

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
});
