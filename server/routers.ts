import { COOKIE_NAME } from "@shared/const";
import JSZip from "jszip";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { PNG } from "pngjs";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { addStickerReference, addStickerScript, addStickerVersion, createStickerProject, getStickerProject, getDb, getStickerStudio, updateStickerScript } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { publicProcedure, router } from "./_core/trpc";

const imageRefSchema = z.object({ url: z.string().min(1), mimeType: z.string().default("image/png") });
type GenerateInput = { photoDataUrl: string; style: string; emotion: string; prompt?: string; characterProfile?: string; phrase?: string; scene?: string; referenceUrls?: string[] };
type RefineInput = { currentImageUrl: { url: string; mimeType: string }; instruction: string; history: Array<{ role: "user" | "assistant"; content: string }> };

async function resolveImageRef(source: string, mimeType = "image/png") {
  if (/^https?:\/\//.test(source)) return { url: source, mimeType };
  if (source.startsWith("/manus-storage/")) {
    const signedUrl = await storageGetSignedUrl(source.replace(/^\/manus-storage\//, ""));
    return { url: signedUrl, mimeType };
  }
  const match = source.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("圖片格式無法辨識，請重新上傳 JPG、PNG 或 WEBP 圖片");
  return { b64Json: match[2], mimeType: match[1] };
}

async function normalizeReference(base64Data: string, mimeType: string) {
  const buffer = await sharp(Buffer.from(base64Data, "base64")).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  return storagePut(`sticker-references/${Date.now()}-${nanoid(6)}.jpg`, buffer, "image/jpeg");
}

async function createTransparentCutout(base64Data: string) {
  const normalizedPng = await sharp(Buffer.from(base64Data, "base64")).ensureAlpha().png().toBuffer();
  const png = PNG.sync.read(normalizedPng);
  const { width, height, data } = png;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4].map((offset) => [data[offset], data[offset + 1], data[offset + 2]] as const);
  const isBackgroundLike = (offset: number) => corners.some(([r, g, b]) => Math.hypot(data[offset] - r, data[offset + 1] - g, data[offset + 2] - b) < 58);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const enqueue = (x: number, y: number) => { const index = y * width + x; if (visited[index]) return; const offset = index * 4; if (!isBackgroundLike(offset)) return; visited[index] = 1; queue.push(index); };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  while (queue.length) { const index = queue.pop()!; const x = index % width; const y = Math.floor(index / width); data[index * 4 + 3] = 0; if (x > 0) enqueue(x - 1, y); if (x < width - 1) enqueue(x + 1, y); if (y > 0) enqueue(x, y - 1); if (y < height - 1) enqueue(x, y + 1); }
  if (!Array.from({ length: width * height }, (_, index) => data[index * 4 + 3]).some((alpha) => alpha === 0)) throw new Error("無法安全分離背景");
  return PNG.sync.write(png);
}

async function storeGeneratedResult(result: Awaited<ReturnType<typeof generateImage>>) {
  if (!result.url) throw new Error("AI 沒有回傳圖片，請稍後重試");
  if (!result.b64Json) return { url: result.url, hasAlpha: Boolean(result.hasAlpha) };
  try {
    const processed = await createTransparentCutout(result.b64Json);
    const saved = await storagePut(`generated/sticker-${Date.now()}-${nanoid(6)}.png`, processed, "image/png");
    return { url: saved.url, hasAlpha: true };
  } catch {
    return { url: result.url, hasAlpha: Boolean(result.hasAlpha) };
  }
}

async function generateStickerOne(refs: Awaited<ReturnType<typeof resolveImageRef>>[], input: { style: string; characterProfile?: string }, item: z.infer<typeof scriptSchema>) {
  try {
    const result = await generateImage({ prompt: buildStickerPrompt({ style: input.style, emotion: item.emotion, phrase: item.phrase, scene: item.scene, characterProfile: input.characterProfile }), originalImages: refs, quality: "medium" });
    const stored = await storeGeneratedResult(result);
    return { ...item, ...stored, mode: "generate" as const, quality: { transparent: stored.hasAlpha, phrase: item.phrase, dimensions: "檢查完成", textReady: Boolean(item.phrase) }, error: undefined };
  } catch (error) {
    return { ...item, url: "", mode: "generate" as const, hasAlpha: false, quality: undefined, error: error instanceof Error ? error.message : "這張貼圖生成失敗" };
  }
}

export function buildStickerPrompt(input: { prompt?: string; style: string; emotion: string; characterProfile?: string; phrase?: string; scene?: string }) {
  return [
    "Create one polished messaging sticker from the supplied character reference images.",
    "Preserve the exact character identity, species, colors, markings, face and recognizable features across all references. Do not invent another character.",
    `Visual style: ${input.style}. Emotion or action: ${input.emotion}.`,
    input.characterProfile ? `Character bible: ${input.characterProfile}.` : "Keep the character consistent with the reference photos.",
    input.phrase ? `Sticker phrase in Traditional Chinese: ${input.phrase}.` : "Use no text unless requested.",
    input.scene ? `Scene and pose: ${input.scene}.` : "Use a clear expressive pose.",
    input.prompt ? `Additional user direction: ${input.prompt}.` : "",
    "One subject, clean messaging-sticker composition, transparent background, no watermark, no extra characters.",
  ].filter(Boolean).join(" ");
}

export function buildCharacterSamplePrompt(input: { characterNeed: string; action: string; text: string }) {
  return [
    "Create a single polished messaging-sticker character sample from this written brief.",
    `Character requirement: ${input.characterNeed}.`,
    `Required action or pose: ${input.action}.`,
    `Display this Traditional Chinese sticker text exactly and clearly: ${input.text}.`,
    "Create one memorable, consistent character with a clean expressive pose, generous transparent background, no watermark, no extra characters, and no decorative frame.",
  ].join(" ");
}

export function buildCharacterVariationPrompt(input: { characterNeed: string; action: string; text: string }) {
  return [
    "Create a new messaging sticker by using the supplied image as the exact approved character reference.",
    "Preserve the same character identity, silhouette, facial features, colors, outfit, illustration style, proportions, and recognizable details. Do not create a different character.",
    `Original character requirement: ${input.characterNeed}.`,
    `New required action or pose: ${input.action}.`,
    `Display this Traditional Chinese sticker text exactly and clearly: ${input.text}.`,
    "One subject only, transparent background, clean edges, no watermark, no unrelated objects, and no decorative frame.",
  ].join(" ");
}

export function buildCutoutPrompt() { return "Remove the background from the supplied character photo using semantic subject understanding. Preserve every part of the character, including pale or white areas, fur, whiskers, ears, hands and accessories. Return the same character isolated on a transparent background, with clean edges and no new objects."; }
export function buildRefinementPrompt(instruction: string, plan: string) { return ["Edit the supplied sticker image while preserving the original character identity and overall composition.", `Apply this requested change: ${instruction}.`, `Use this concise visual plan: ${plan}.`, "Keep the result as a polished messaging sticker with clean edges, readable Traditional Chinese text when relevant, no watermark and no unrelated changes."].join(" "); }

const scriptSchema = z.object({ position: z.number().int().min(1).max(40), emotion: z.string().min(1).max(80), phrase: z.string().min(1).max(160), scene: z.string().max(300) });

const fallbackPhraseSeeds = [
  ["早安", "揮手打招呼，精神飽滿"], ["謝謝", "雙手合十，溫暖微笑"], ["收到", "敬禮或點頭，表情俐落"], ["加油", "握拳鼓勵，充滿活力"], ["等等我", "小跑步揮手，帶一點急迫感"], ["好累喔", "慵懶趴下，表情可愛"], ["太好了", "開心跳起來，周圍有小星星"], ["不要啦", "搖手拒絕，表情撒嬌"], ["晚安", "抱著枕頭打呵欠"], ["掰掰", "揮手道別，笑容可愛"],
] as const;

export function buildFallbackProjectPlan(input: { brief: string; style: string; stickerCount: number; characterProfile?: string }) {
  return {
    title: "我的專屬貼圖組",
    characterProfile: input.characterProfile || "請依據上傳照片保留角色的臉型、配色、毛色或服裝等可辨識特徵，所有貼圖維持一致角色設定。",
    scripts: Array.from({ length: input.stickerCount }, (_, index) => {
      const [phrase, scene] = fallbackPhraseSeeds[index % fallbackPhraseSeeds.length];
      return { position: index + 1, emotion: phrase, phrase, scene };
    }),
    fallback: true,
    fallbackMessage: "AI 規劃服務暫時沒有可用額度，已先建立可編輯的基礎貼圖腳本。",
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  project: router({
    plan: publicProcedure.input(z.object({ brief: z.string().min(3).max(1000), style: z.string().min(1), stickerCount: z.number().int().min(4).max(40), characterProfile: z.string().max(1200).optional() })).mutation(async ({ input }) => {
      try {
        const planResult = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You are a professional messaging sticker art director. Create a practical sticker project plan in Traditional Chinese. Output JSON only." }, { role: "user", content: `需求：${input.brief}\n風格：${input.style}\n張數：${input.stickerCount}\n角色補充：${input.characterProfile ?? "請從照片分析"}` }], response_format: { type: "json_schema", json_schema: { name: "sticker_project_plan", strict: true, schema: { type: "object", properties: { title: { type: "string" }, characterProfile: { type: "string" }, scripts: { type: "array", items: { type: "object", properties: { position: { type: "integer" }, emotion: { type: "string" }, phrase: { type: "string" }, scene: { type: "string" } }, required: ["position", "emotion", "phrase", "scene"], additionalProperties: false } } }, required: ["title", "characterProfile", "scripts"], additionalProperties: false } } } });
        const raw = planResult.choices[0]?.message?.content;
        if (typeof raw !== "string") throw new Error("AI 方案規劃沒有回傳內容");
        return { ...(JSON.parse(raw) as { title: string; characterProfile: string; scripts: Array<z.infer<typeof scriptSchema>> }), fallback: false, fallbackMessage: undefined };
      } catch (error) {
        console.warn("[Sticker plan] Falling back to editable local plan:", error);
        return buildFallbackProjectPlan(input);
      }
    }),
    create: publicProcedure.input(z.object({ title: z.string().min(1).max(160), brief: z.string().max(1000), style: z.string().min(1).max(80), stickerCount: z.number().int().min(4).max(40), characterProfile: z.string().max(2000), references: z.array(z.object({ url: z.string(), fileName: z.string(), sortOrder: z.number().int() })).max(10), scripts: z.array(scriptSchema).max(40) })).mutation(async ({ input }) => {
      const project = await createStickerProject({ projectKey: nanoid(12), title: input.title, brief: input.brief, style: input.style, stickerCount: input.stickerCount, characterProfile: input.characterProfile, status: "draft" });
      if (!project) throw new Error("貼圖專案資料庫暫時無法使用，請稍後再試");
      for (const ref of input.references) await addStickerReference({ projectId: project.id, ...ref });
      for (const script of input.scripts) await addStickerScript({ projectId: project.id, ...script });
      return { projectKey: project.projectKey, scripts: input.scripts };
    }),
    get: publicProcedure.input(z.object({ projectKey: z.string().min(1) })).query(async ({ input }) => (await getStickerProject(input.projectKey)) ?? null),
    prepareReference: publicProcedure.input(z.object({ photoDataUrl: z.string().min(32), fileName: z.string().min(1) })).mutation(async ({ input }) => { const parsed = await resolveImageRef(input.photoDataUrl); if (!parsed.b64Json) throw new Error("參考照片格式無法讀取"); const saved = await normalizeReference(parsed.b64Json, parsed.mimeType); return { url: saved.url, fileName: input.fileName, mimeType: "image/jpeg" }; }),
  }),
  studio: router({
    get: publicProcedure.input(z.object({ projectKey: z.string().min(1) })).query(({ input }) => getStickerStudio(input.projectKey)),
    sendMessage: publicProcedure.input(z.object({ projectKey: z.string().min(1).optional(), content: z.string().min(1).max(4000), attachments: z.array(z.object({ dataUrl: z.string().min(32), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120) })).max(10).default([]) })).mutation(async ({ input }) => {
      const { sendStudioMessage } = await import("./studio");
      return sendStudioMessage(input);
    }),
    runPending: publicProcedure.input(z.object({ projectKey: z.string().min(1), maxJobs: z.number().int().min(1).max(4).default(2), position: z.number().int().min(1).max(40).optional() })).mutation(async ({ input }) => {
      const { runPendingStudioJobs } = await import("./studio");
      return runPendingStudioJobs(input.projectKey, input.maxJobs, input.position);
    }),
    retrySticker: publicProcedure.input(z.object({ projectKey: z.string().min(1), position: z.number().int().min(1).max(40) })).mutation(async ({ input }) => {
      const { retryStudioSticker } = await import("./studio");
      return retryStudioSticker(input.projectKey, input.position);
    }),
    editSticker: publicProcedure.input(z.object({ projectKey: z.string().min(1), position: z.number().int().min(1).max(40), instruction: z.string().min(2).max(500) })).mutation(async ({ input }) => {
      const { editStudioSticker } = await import("./studio");
      return editStudioSticker(input);
    }),
  }),
  creative: router({
    generateSample: publicProcedure.input(z.object({ characterNeed: z.string().min(2).max(800), action: z.string().min(1).max(160), text: z.string().min(1).max(80) })).mutation(async ({ input }) => { const result = await generateImage({ prompt: buildCharacterSamplePrompt(input), quality: "medium" }); const stored = await storeGeneratedResult(result); return { ...stored, mode: "sample" as const }; }),
    generateVariation: publicProcedure.input(z.object({ sampleImageUrl: z.string().min(1), characterNeed: z.string().min(2).max(800), action: z.string().min(1).max(160), text: z.string().min(1).max(80) })).mutation(async ({ input }) => { const reference = await resolveImageRef(input.sampleImageUrl); const result = await generateImage({ prompt: buildCharacterVariationPrompt(input), originalImages: [reference], quality: "medium" }); const stored = await storeGeneratedResult(result); return { ...stored, mode: "variation" as const }; }),
    generate: publicProcedure.input(z.object({ photoDataUrl: z.string().min(32), style: z.string().min(1).max(80), emotion: z.string().min(1).max(80), prompt: z.string().max(500).optional(), characterProfile: z.string().max(2000).optional(), phrase: z.string().max(160).optional(), scene: z.string().max(300).optional(), referenceUrls: z.array(z.string()).max(10).optional() })).mutation(async ({ input }: { input: GenerateInput }) => { const refs = input.referenceUrls?.length ? await Promise.all(input.referenceUrls.map((url) => resolveImageRef(url))) : [await resolveImageRef(input.photoDataUrl)]; const result = await generateImage({ prompt: buildStickerPrompt(input), originalImages: refs, quality: "medium" }); const stored = await storeGeneratedResult(result); return { ...stored, mode: "generate" as const }; }),
    generateBatch: publicProcedure.input(z.object({ projectKey: z.string().optional(), photoDataUrl: z.string().min(32), referenceUrls: z.array(z.string()).max(10).optional(), style: z.string().min(1), characterProfile: z.string().max(2000).optional(), items: z.array(scriptSchema).min(1).max(40) })).mutation(async ({ input }) => { const refs = input.referenceUrls?.length ? await Promise.all(input.referenceUrls.map((url) => resolveImageRef(url))) : [await resolveImageRef(input.photoDataUrl)]; const project = input.projectKey ? await getStickerProject(input.projectKey) : undefined; const scriptRows = new Map((project?.scripts ?? []).map((script) => [script.position, script])); const results = []; for (let index = 0; index < input.items.length; index += 2) { const chunk = input.items.slice(index, index + 2); const generated = await Promise.all(chunk.map((item) => generateStickerOne(refs, input, item))); results.push(...generated); await Promise.all(generated.map((item) => { const row = scriptRows.get(item.position); if (!row) return undefined; return updateStickerScript({ id: row.id, status: item.error ? "error" : "ready", resultUrl: item.url || null, errorMessage: item.error || null, qualityReport: item.quality ? JSON.stringify(item.quality) : null }); })); } return results; }),
    removeBackground: publicProcedure.input(z.object({ photoDataUrl: z.string().min(32) })).mutation(async ({ input }) => { const original = await resolveImageRef(input.photoDataUrl); const result = await generateImage({ prompt: buildCutoutPrompt(), originalImages: [original], quality: "high" }); if (!result.url) throw new Error("AI 沒有回傳去背圖片，請稍後重試"); const stored = await storeGeneratedResult(result); return { url: stored.url, mode: "cutout" as const, hasAlpha: stored.hasAlpha }; }),
    refine: publicProcedure.input(z.object({ currentImageUrl: imageRefSchema, instruction: z.string().min(2).max(500), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(700) })).max(12).default([]) })).mutation(async ({ input }: { input: RefineInput }) => { try { const planResult = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You are a sticker art director. Convert the user's requested edit into one concise visual plan. Return JSON only." }, ...input.history.map((item) => ({ role: item.role, content: item.content })), { role: "user", content: input.instruction }], response_format: { type: "json_schema", json_schema: { name: "sticker_refinement", strict: true, schema: { type: "object", properties: { plan: { type: "string" }, reply: { type: "string" } }, required: ["plan", "reply"], additionalProperties: false } } } }); const raw = planResult.choices[0]?.message?.content; const parsed = typeof raw === "string" ? JSON.parse(raw) as { plan: string; reply: string } : { plan: input.instruction, reply: "我會依照你的要求重新調整貼圖。" }; const result = await generateImage({ prompt: buildRefinementPrompt(input.instruction, parsed.plan), originalImages: [await resolveImageRef(input.currentImageUrl.url, input.currentImageUrl.mimeType)], quality: "medium" }); const stored = await storeGeneratedResult(result); return { ...stored, reply: parsed.reply, plan: parsed.plan, mode: "refine" as const, unchanged: false }; } catch (error) { const message = error instanceof Error ? error.message : "AI 修改服務暫時無法使用"; if (/usage exhausted|failed_precondition/i.test(message)) return { url: input.currentImageUrl.url, mode: "refine" as const, hasAlpha: false, plan: input.instruction, reply: "AI 修改服務目前使用量已暫時耗盡，原本版本已保留；請稍後再試。", unchanged: true }; throw error; } }),
    qualityCheck: publicProcedure.input(z.object({ url: z.string(), phrase: z.string().max(160) })).mutation(async ({ input }) => { const signed = await resolveImageRef(input.url); if (!signed.url) throw new Error("無法取得圖片網址"); const response = await fetch(signed.url); const buffer = Buffer.from(await response.arrayBuffer()); const metadata = await sharp(buffer).metadata(); const transparent = metadata.hasAlpha === true; const dimensions = Boolean(metadata.width && metadata.height && metadata.width >= 240 && metadata.height >= 240); const textReady = input.phrase.trim().length > 0 && input.phrase.length <= 40; return { transparent, dimensions, textReady, report: { transparent: transparent ? "透明背景已檢查" : "需要重新去背", dimensions: dimensions ? `${metadata.width}×${metadata.height}` : "尺寸需要調整", text: textReady ? "文字腳本已建立，請人工確認字形" : "尚未設定文字" } }; }),
    exportZip: publicProcedure.input(z.object({ files: z.array(z.object({ url: z.string(), fileName: z.string() })).min(1).max(40) })).mutation(async ({ input }) => { const zip = new JSZip(); for (const file of input.files) { const signed = await resolveImageRef(file.url); if (!signed.url) throw new Error(`無法取得 ${file.fileName} 的圖片網址`); const response = await fetch(signed.url); if (!response.ok) throw new Error(`無法讀取 ${file.fileName}`); zip.file(file.fileName, Buffer.from(await response.arrayBuffer())); } return { fileName: "sticker-tycoon-pack.zip", base64: await zip.generateAsync({ type: "base64", compression: "DEFLATE" }) }; }),
  }),
});

export type AppRouter = typeof appRouter;
