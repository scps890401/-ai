import { z } from "zod";
import { routeStickerImage, type ImageGenerator } from "./imageRouter";
import { publicProcedure, router } from "./_core/trpc";

export const lotteryStickerInput = z.object({
  text: z.string().min(1).max(255),
  action: z.string().min(1).max(255),
  character: z.string().min(1).max(255),
  creative: z.string().min(1).max(500),
});

const imageReferenceInput = z.object({
  b64Json: z.string().min(20),
  mimeType: z.string().min(3),
});

const semanticReferenceInput = z.object({
  role: z.enum(["character", "style", "pose", "scene", "current"]),
  image: imageReferenceInput,
  priority: z.number().int().min(1).max(100),
  note: z.string().max(300).optional(),
});

export const randomStickerInput = z.object({
  prompt: z.string().min(1).max(500),
  originalImage: imageReferenceInput.optional(),
  referenceImages: z.array(imageReferenceInput).min(1).max(4).optional(),
  referenceContext: z.array(semanticReferenceInput).min(1).max(4).optional(),
}).superRefine((input, context) => {
  if (!input.originalImage && !input.referenceImages?.length && !input.referenceContext?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["originalImage"], message: "至少需要一張角色或風格參考圖片。" });
  }
});

export function buildLotteryStickerPrompt(input: z.infer<typeof lotteryStickerInput>) {
  return `Create one original LINE sticker with no reference photo. Main character: ${input.character}. Spoken text in Traditional Chinese: 「${input.text}」. Pose and action: ${input.action}. Visual idea: ${input.creative}. Warm hand-drawn illustration, clear expressive silhouette, balanced sticker composition, leave a clean uncluttered area for the app to typeset Traditional Chinese, do not render words or letters inside the image, transparent background, no watermark, no brand logos, no extra characters, no unrelated objects.`;
}

export function buildRandomStickerPrompt(prompt: string, referenceRoles: Array<z.infer<typeof semanticReferenceInput>["role"]> = []) {
  const roleGuide = referenceRoles.length ? `Reference roles are semantically assigned as follows: ${referenceRoles.join(", ")}. Character references preserve identity; pose references control only body pose; style references control only line, palette and rendering; scene references control only props/composition; current references preserve the image being edited. Never merge identities between different role references.` : "Treat the supplied image as the primary character reference.";
  return `Create a LINE sticker based on the exact character and style shown in the provided reference images. ${roleGuide} Preserve the character's identity, species, colors, markings, face, proportions, recognizable appearance, and confirmed visual style. Do not replace the character with a generic illustration and do not create a text-only variation. Show the same character naturally performing this action or expression: ${prompt}. Clean sticker composition, expressive pose, leave a clean uncluttered area for the app to typeset Traditional Chinese, do not render words or letters inside the image, transparent background, no extra characters, no watermark, no unrelated objects.`;
}

export async function generateLotterySticker(input: z.infer<typeof lotteryStickerInput>, imageGenerator?: ImageGenerator) {
  const result = await routeStickerImage({ prompt: buildLotteryStickerPrompt(input), task: "generate", finalQuality: true }, imageGenerator);
  return { url: result.url, provider: result.provider, model: result.model, selectedReason: result.selectedReason, attempts: result.attempts };
}

export async function generateRandomSticker(input: z.infer<typeof randomStickerInput>, imageGenerator?: ImageGenerator) {
  const referenceContext = input.referenceContext?.length ? input.referenceContext : undefined;
  const referenceImages = referenceContext?.map((reference) => reference.image) ?? (input.referenceImages?.length ? input.referenceImages : input.originalImage ? [input.originalImage] : []);
  if (!referenceImages.length) throw new Error("At least one reference image is required");
  const result = await routeStickerImage({
    prompt: buildRandomStickerPrompt(input.prompt, referenceContext?.map((reference) => reference.role)),
    originalImages: referenceImages,
    references: referenceContext,
    task: "edit",
    highCharacterConsistency: Boolean(referenceContext?.some((reference) => reference.role === "character" || reference.role === "pose")),
    finalQuality: true,
  }, imageGenerator);
  return { url: result.url, provider: result.provider, model: result.model, selectedReason: result.selectedReason, attempts: result.attempts };
}

export const stickerRouter = router({
  randomGenerate: publicProcedure.input(randomStickerInput).mutation(({ input }) => generateRandomSticker(input)),
  lotteryGenerate: publicProcedure.input(lotteryStickerInput).mutation(({ input }) => generateLotterySticker(input)),
});
