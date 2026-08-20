import { COOKIE_NAME } from "@shared/const";
import sharp from "sharp";
import { PNG } from "pngjs";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { storageGetSignedUrl, storagePut } from "./storage";
import { publicProcedure, router } from "./_core/trpc";

const imageRefSchema = z.object({ url: z.string().min(1), mimeType: z.string().default("image/png") });
type GenerateInput = { photoDataUrl: string; style: string; emotion: string; prompt?: string };
type CutoutInput = { photoDataUrl: string };
type RefineInput = { currentImageUrl: { url: string; mimeType: string }; instruction: string; history: Array<{ role: "user" | "assistant"; content: string }> };

async function resolveImageRef(source: string) {
  if (/^https?:\/\//.test(source)) return { url: source, mimeType: "image/png" };
  if (source.startsWith("/manus-storage/")) {
    const signedUrl = await storageGetSignedUrl(source.replace(/^\/manus-storage\//, ""));
    return { url: signedUrl, mimeType: "image/png" };
  }
  const match = source.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("圖片格式無法辨識，請重新上傳 PNG、JPG 或 WEBP 圖片");
  return { b64Json: match[2], mimeType: match[1] };
}

async function createTransparentCutout(base64Data: string) {
  const normalizedPng = await sharp(Buffer.from(base64Data, "base64")).ensureAlpha().png().toBuffer();
  const png = PNG.sync.read(normalizedPng);
  const { width, height, data } = png;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4].map((offset) => [data[offset], data[offset + 1], data[offset + 2]] as const);
  const isBackgroundLike = (offset: number) => corners.some(([r, g, b]) => Math.hypot(data[offset] - r, data[offset + 1] - g, data[offset + 2] - b) < 58);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const enqueue = (x: number, y: number) => {
    const index = y * width + x;
    if (visited[index]) return;
    const offset = index * 4;
    if (!isBackgroundLike(offset)) return;
    visited[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  while (queue.length) {
    const index = queue.pop()!;
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }
  const hasAlpha = Array.from({ length: width * height }, (_, index) => data[index * 4 + 3]).some((alpha) => alpha === 0);
  if (!hasAlpha) throw new Error("AI 回傳圖片無法安全分離背景，請重新嘗試去背");
  return PNG.sync.write(png);
}

export function buildStickerPrompt(input: { prompt?: string; style: string; emotion: string }) {
  return [
    "Create a polished messaging sticker from the supplied character image.",
    "Preserve the exact character identity, species, colors, markings, face and recognizable features.",
    `Visual style: ${input.style}. Emotion or action: ${input.emotion}.`,
    input.prompt ? `User direction: ${input.prompt}.` : "Add a clear, friendly pose that matches the emotion.",
    "Use a clean sticker composition, transparent-looking background, bold readable Traditional Chinese sticker lettering only when requested, no watermark, no extra characters.",
  ].join(" ");
}

export function buildCutoutPrompt() {
  return "Remove the background from the supplied character photo using semantic subject understanding. Preserve every part of the character, including pale or white areas, fur, whiskers, ears, hands and accessories. Return the same character isolated on a transparent background, with clean edges and no new objects.";
}

export function buildRefinementPrompt(instruction: string, plan: string) {
  return [
    "Edit the supplied sticker image while preserving the original character identity and overall composition.",
    `Apply this requested change: ${instruction}.`,
    `Use this concise visual plan: ${plan}.`,
    "Keep the result as a polished messaging sticker with clean edges, readable Traditional Chinese text when relevant, no watermark and no unrelated changes.",
  ].join(" ");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  creative: router({
    generate: publicProcedure
      .input(z.object({
        photoDataUrl: z.string().min(32),
        style: z.string().min(1).max(80),
        emotion: z.string().min(1).max(80),
        prompt: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }: { input: GenerateInput }) => {
        const original = await resolveImageRef(input.photoDataUrl);
        const result = await generateImage({
          prompt: buildStickerPrompt(input),
          originalImages: [original],
          quality: "medium",
        });
        if (!result.url) throw new Error("AI 沒有回傳圖片，請稍後重試");
        return { url: result.url, mode: "generate" as const };
      }),
    removeBackground: publicProcedure
      .input(z.object({ photoDataUrl: z.string().min(32) }))
      .mutation(async ({ input }: { input: CutoutInput }) => {
        const original = await resolveImageRef(input.photoDataUrl);
        const result = await generateImage({ prompt: buildCutoutPrompt(), originalImages: [original], quality: "high" });
        if (!result.url) throw new Error("AI 沒有回傳去背圖片，請稍後重試");
        if (result.hasAlpha) return { url: result.url, mode: "cutout" as const };
        if (!result.b64Json) throw new Error("AI 回傳的圖片沒有透明背景，請重新嘗試去背");
        const processed = await createTransparentCutout(result.b64Json);
        const saved = await storagePut(`generated/cutout-${Date.now()}.png`, processed, "image/png");
        return { url: saved.url, mode: "cutout" as const };
      }),
    refine: publicProcedure
      .input(z.object({
        currentImageUrl: imageRefSchema,
        instruction: z.string().min(2).max(500),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(700) })).max(12).default([]),
      }))
      .mutation(async ({ input }: { input: RefineInput }) => {
        const planResult = await invokeLLM({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: "You are a sticker art director. Convert the user's requested edit into one concise visual plan. Return JSON only." },
            ...input.history.map((item: RefineInput["history"][number]) => ({ role: item.role, content: item.content })),
            { role: "user", content: input.instruction },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "sticker_refinement",
              strict: true,
              schema: {
                type: "object",
                properties: { plan: { type: "string" }, reply: { type: "string" } },
                required: ["plan", "reply"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = planResult.choices[0]?.message?.content;
        const parsed = typeof raw === "string" ? JSON.parse(raw) as { plan: string; reply: string } : { plan: input.instruction, reply: "我會依照你的要求重新調整貼圖。" };
        const result = await generateImage({
          prompt: buildRefinementPrompt(input.instruction, parsed.plan),
          originalImages: [await resolveImageRef(input.currentImageUrl.url)],
          quality: "medium",
        });
        if (!result.url) throw new Error("AI 沒有回傳修改後圖片，請稍後重試");
        return { url: result.url, reply: parsed.reply, plan: parsed.plan, mode: "refine" as const };
      }),
  }),
});

export type AppRouter = typeof appRouter;
