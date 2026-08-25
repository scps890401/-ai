import { nanoid } from "nanoid";
import { z } from "zod";
import { buildFallbackProjectPlan, buildRefinementPrompt, buildStickerPrompt } from "./routers";
import { addStickerReference, addStickerScript, addStickerVersion, addStickerAttachments, addStickerMessage, createStickerConversation, createStickerJob, createStickerProject, getStickerProject, getStickerStudio, saveStickerCharacterProfile, updateStickerJob, updateStickerProject, updateStickerScript } from "./db";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl, storagePut } from "./storage";

const plannerSchema = z.object({
  intent: z.enum(["create_project", "plan_pack", "generate_pending", "retry_sticker", "edit_sticker", "continue_project", "general" ]),
  reply: z.string().min(1).max(800),
  projectTitle: z.string().min(1).max(160),
  stickerCount: z.number().int().min(8).max(40),
  characterProfile: z.string().min(1).max(2000),
  scripts: z.array(z.object({ position: z.number().int().min(1).max(40), emotion: z.string().min(1).max(80), phrase: z.string().min(1).max(160), scene: z.string().max(300) })).max(40),
  targetPosition: z.number().int().min(0).max(40),
  editInstruction: z.string().max(500),
});

type StudioPlan = z.infer<typeof plannerSchema>;
type IncomingAttachment = { dataUrl: string; fileName: string; mimeType: string };

function readDataUrl(dataUrl: string) {
  const matched = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!matched) throw new Error("附件格式無法辨識，請重新選取檔案");
  return { mimeType: matched[1], bytes: Buffer.from(matched[2], "base64") };
}

function normaliseProjectTitle(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.slice(0, 36) || "我的 LINE 貼圖專案";
}

function extractStickerCount(message: string) {
  const matched = message.match(/(?:做成|製作|生成|要|做)?\s*(8|16|24|32|40)\s*(?:張|個)?(?:貼圖)?/);
  return matched ? Number(matched[1]) : 8;
}

function isQuotaError(error: unknown) {
  return error instanceof GeminiImageError ? error.code === "USAGE_EXHAUSTED" : /usage exhausted|failed_precondition|quota|resource_exhausted/i.test(error instanceof Error ? error.message : "");
}

async function signedReference(url: string, mimeType = "image/jpeg") {
  if (/^https?:\/\//.test(url)) return { url, mimeType };
  if (!url.startsWith("/manus-storage/")) throw new Error("角色參考圖網址無法辨識");
  return { url: await storageGetSignedUrl(url.replace(/^\/manus-storage\//, "")), mimeType };
}

async function persistAttachments(projectId: number, messageId: number, attachments: IncomingAttachment[]) {
  const saved = [] as Array<{ url: string; fileName: string; mimeType: string; fileKey: string; sortOrder: number }>;
  for (let sortOrder = 0; sortOrder < attachments.length; sortOrder += 1) {
    const attachment = attachments[sortOrder]!;
    const parsed = readDataUrl(attachment.dataUrl);
    if (parsed.bytes.byteLength > 12 * 1024 * 1024) throw new Error(`${attachment.fileName} 超過 12 MB 上限`);
    const extension = attachment.mimeType.includes("png") ? "png" : attachment.mimeType.includes("webp") ? "webp" : attachment.mimeType.includes("pdf") ? "pdf" : "jpg";
    const fileKey = `sticker-chat/${projectId}/${Date.now()}-${nanoid(8)}.${extension}`;
    const result = await storagePut(fileKey, parsed.bytes, parsed.mimeType);
    saved.push({ url: result.url, fileName: attachment.fileName, mimeType: parsed.mimeType, fileKey, sortOrder });
  }
  await addStickerAttachments(saved.map((item) => ({ ...item, projectId, messageId })));
  return saved;
}

function fallbackPlan(message: string): StudioPlan {
  const stickerCount = extractStickerCount(message);
  const fallback = buildFallbackProjectPlan({ brief: message, style: "可愛、清晰、適合日常溝通的 LINE 貼圖", stickerCount, characterProfile: message });
  return {
    intent: /繼續製作|繼續生成/.test(message) ? "continue_project" : /修改|第\s*\d+\s*張/.test(message) ? "edit_sticker" : /幫我|做成|製作|生成|開始/.test(message) ? "generate_pending" : "plan_pack",
    reply: fallback.fallbackMessage,
    projectTitle: fallback.title,
    stickerCount,
    characterProfile: fallback.characterProfile,
    scripts: fallback.scripts,
    targetPosition: Number(message.match(/第\s*(\d+)\s*張/)?.[1] ?? 0),
    editInstruction: message,
  };
}

async function createPlan(message: string, referenceUrls: string[]) {
  try {
    const visionContent = await Promise.all(referenceUrls.slice(0, 4).map(async (url) => ({ type: "image_url" as const, image_url: { url: (await signedReference(url)).url, detail: "high" as const } })));
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: "你是 LINE 貼圖工作室的中文創作總監。使用者只用自然語言操作。分析他們的需求與參考圖片，輸出一份務實的 JSON 計畫。只有在使用者明確要求生成、繼續或重試時才設定 generate_pending、continue_project 或 retry_sticker。若有圖片，角色設定必須涵蓋外觀、服裝或毛色、配件、比例、畫風與不可變特徵。貼圖腳本應為日常繁體中文、動作多樣、適合訊息溝通。" },
        { role: "user", content: [{ type: "text", text: message }, ...visionContent] },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "line_sticker_studio_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ["create_project", "plan_pack", "generate_pending", "retry_sticker", "edit_sticker", "continue_project", "general"] },
              reply: { type: "string" }, projectTitle: { type: "string" }, stickerCount: { type: "integer" }, characterProfile: { type: "string" },
              scripts: { type: "array", items: { type: "object", properties: { position: { type: "integer" }, emotion: { type: "string" }, phrase: { type: "string" }, scene: { type: "string" } }, required: ["position", "emotion", "phrase", "scene"], additionalProperties: false } },
              targetPosition: { type: "integer" }, editInstruction: { type: "string" },
            },
            required: ["intent", "reply", "projectTitle", "stickerCount", "characterProfile", "scripts", "targetPosition", "editInstruction"], additionalProperties: false,
          },
        },
      },
    });
    const text = response.choices[0]?.message?.content;
    return plannerSchema.parse(typeof text === "string" ? JSON.parse(text) : fallbackPlan(message));
  } catch (error) {
    console.warn("[Studio planner] using saved fallback", error);
    return fallbackPlan(message);
  }
}

async function createProjectIfNeeded(projectKey: string | undefined, message: string) {
  if (projectKey) {
    const existing = await getStickerProject(projectKey);
    if (existing) return existing.project;
  }
  const created = await createStickerProject({ projectKey: nanoid(12), title: normaliseProjectTitle(message), brief: message, style: "對話優先 LINE 貼圖", stickerCount: extractStickerCount(message), characterProfile: "", status: "draft" });
  if (!created) throw new Error("無法建立貼圖專案，請稍後再試");
  await createStickerConversation(created.id);
  return created;
}

async function ensureConversation(projectId: number) {
  const studio = await getStickerStudioByProjectId(projectId);
  if (studio?.conversation) return studio.conversation;
  const conversation = await createStickerConversation(projectId);
  if (!conversation) throw new Error("無法建立對話工作階段");
  return conversation;
}

async function getStickerStudioByProjectId(projectId: number) {
  // Small local lookup avoids adding another public database primitive just for conversation setup.
  const projects = await getStickerProjectById(projectId);
  return projects ? getStickerStudio(projects.projectKey) : undefined;
}

async function getStickerProjectById(projectId: number) {
  const candidate = await getStickerStudioFromProjectId(projectId);
  return candidate?.project;
}

// Kept separate for tests and to centralize project-key lookup through the existing stored project data.
async function getStickerStudioFromProjectId(projectId: number) {
  const all = await getStickerProjectByIdViaDb(projectId);
  return all ? getStickerStudio(all.projectKey) : undefined;
}

async function getStickerProjectByIdViaDb(projectId: number) {
  const { getDb } = await import("./db");
  const { stickerProjects } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(stickerProjects).where(eq(stickerProjects.id, projectId)).limit(1))[0];
}

export async function sendStudioMessage(input: { projectKey?: string; content: string; attachments: IncomingAttachment[] }) {
  const project = await createProjectIfNeeded(input.projectKey, input.content);
  const conversation = await ensureConversation(project.id);
  const userMessage = await addStickerMessage({ conversationId: conversation.id, role: "user", content: input.content });
  if (!userMessage) throw new Error("無法保存你的訊息");
  const attachmentRows = await persistAttachments(project.id, userMessage.id, input.attachments);
  for (const attachment of attachmentRows.filter((item) => item.mimeType.startsWith("image/"))) await addStickerReference({ projectId: project.id, url: attachment.url, fileName: attachment.fileName, sortOrder: attachment.sortOrder });
  const plan = await createPlan(input.content, attachmentRows.filter((item) => item.mimeType.startsWith("image/")).map((item) => item.url));
  await updateStickerProject({ id: project.id, title: plan.projectTitle, brief: input.content, characterProfile: plan.characterProfile, stickerCount: plan.stickerCount });
  const character = await saveStickerCharacterProfile({ projectId: project.id, profileJson: JSON.stringify({ summary: plan.characterProfile, referenceCount: attachmentRows.length }), anchorUrl: attachmentRows.find((item) => item.mimeType.startsWith("image/"))?.url, status: attachmentRows.length ? "ready" : "needs_reference" });
  const existing = await getStickerProject(project.projectKey);
  if (plan.scripts.length && !(existing?.scripts.length)) {
    for (const script of plan.scripts.slice(0, plan.stickerCount)) {
      const row = await addStickerScript({ projectId: project.id, ...script });
      if (row) await createStickerJob({ projectId: project.id, scriptId: row.id, kind: "generate", status: "queued", provider: "gemini" });
    }
  }
  let reply = plan.reply;
  if (plan.intent === "edit_sticker" && plan.targetPosition > 0) {
    try {
      const edit = await editStudioSticker({ projectKey: project.projectKey, position: plan.targetPosition, instruction: plan.editInstruction || input.content });
      reply = edit.status === "completed" ? `第 ${plan.targetPosition} 張已依照你的要求完成修改，原版本仍可保留追溯。` : edit.status === "paused_quota" ? `第 ${plan.targetPosition} 張的修改已暫停，AI 生成額度目前已用完；原本版本和修改要求都已保存，額度恢復後輸入「繼續製作」即可續作。` : `第 ${plan.targetPosition} 張暫時無法修改：${edit.message ?? "請稍後再試"}`;
    } catch (error) {
      reply = `我已記錄修改要求，但目前無法套用到指定貼圖：${error instanceof Error ? error.message : "請稍後再試"}`;
    }
  }
  const assistant = await addStickerMessage({ conversationId: conversation.id, role: "assistant", content: reply, intentJson: JSON.stringify(plan) });
  return { projectKey: project.projectKey, intent: plan.intent, reply, character, assistantMessageId: assistant?.id, autoRun: plan.intent === "generate_pending" || plan.intent === "continue_project" || (plan.scripts.length > 0 && /幫我|做成|製作|生成|開始/.test(input.content)) };
}

async function storeGeneratedPng(b64Json: string) {
  const buffer = Buffer.from(b64Json, "base64");
  return storagePut(`generated/studio-${Date.now()}-${nanoid(8)}.png`, buffer, "image/png");
}

export async function runPendingStudioJobs(projectKey: string, maxJobs = 2, position?: number) {
  const studio = await getStickerStudio(projectKey);
  if (!studio) throw new Error("找不到要繼續的專案");
  const references = (await getStickerProject(projectKey))?.references ?? [];
  const profile = studio.characterProfile?.profileJson ?? studio.project.characterProfile ?? "請維持所有角色外觀特徵一致";
  const candidates = studio.jobs.filter((job) => {
    if (job.kind !== "generate" || !["queued", "retrying", "paused_quota"].includes(job.status)) return false;
    return position === undefined || studio.scripts.find((script) => script.id === job.scriptId)?.position === position;
  }).slice(0, maxJobs);
  const completed = [] as Array<{ jobId: number; scriptId: number | null; status: string; url?: string; message?: string }>;
  for (const job of candidates) {
    const script = studio.scripts.find((item) => item.id === job.scriptId);
    if (!script) continue;
    await updateStickerJob({ id: job.id, status: "generating", attempt: job.attempt + 1, provider: "gemini", errorCode: null, errorMessage: null });
    await updateStickerScript({ id: script.id, status: "generating", errorMessage: null });
    const prompt = buildStickerPrompt({ style: "可愛、清晰、適合日常溝通的 LINE 貼圖", emotion: script.emotion, phrase: script.phrase, scene: script.scene ?? undefined, characterProfile: profile, prompt: "保留透明背景與約 10 像素安全邊距。文字區保留乾淨空間，最終繁體中文字將由程式後製。" });
    try {
      const result = await generateGeminiImage({ prompt, references: await Promise.all(references.slice(0, 4).map(async (reference) => ({ ...(await signedReference(reference.url)), mimeType: "image/jpeg" }))) });
      const saved = await storeGeneratedPng(result.b64Json);
      await updateStickerScript({ id: script.id, status: "ready", resultUrl: saved.url, errorMessage: null, qualityReport: JSON.stringify({ transparent: true, provider: result.provider, textOverlayPending: true }) });
      await addStickerVersion({ scriptId: script.id, version: 1, url: saved.url, mode: "generate" });
      await updateStickerJob({ id: job.id, status: "completed", provider: result.provider, checkpointJson: JSON.stringify({ url: saved.url }) });
      completed.push({ jobId: job.id, scriptId: script.id, status: "completed", url: saved.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "貼圖生成失敗";
      const paused = isQuotaError(error);
      await updateStickerJob({ id: job.id, status: paused ? "paused_quota" : "failed", errorCode: paused ? "USAGE_EXHAUSTED" : "GENERATION_FAILED", errorMessage: message });
      await updateStickerScript({ id: script.id, status: paused ? "queued" : "error", errorMessage: message });
      completed.push({ jobId: job.id, scriptId: script.id, status: paused ? "paused_quota" : "failed", message });
      if (paused) break;
    }
  }
  return { projectKey, completed, remaining: studio.jobs.filter((job) => job.kind === "generate" && ["queued", "retrying", "paused_quota"].includes(job.status)).length - completed.length };
}

export async function retryStudioSticker(projectKey: string, position: number) {
  const studio = await getStickerStudio(projectKey);
  if (!studio) throw new Error("找不到要重試的專案");
  const script = studio.scripts.find((item) => item.position === position);
  if (!script) throw new Error(`找不到第 ${position} 張貼圖`);
  let job = studio.jobs.filter((item) => item.scriptId === script.id && item.kind === "generate").at(-1);
  if (job) await updateStickerJob({ id: job.id, status: "retrying", errorCode: null, errorMessage: null });
  else job = await createStickerJob({ projectId: studio.project.id, scriptId: script.id, kind: "generate", status: "retrying", provider: "gemini" });
  await updateStickerScript({ id: script.id, status: "queued", errorMessage: null });
  if (!job) throw new Error("無法建立重試工作");
  return runPendingStudioJobs(projectKey, 1, position);
}

export async function editStudioSticker(input: { projectKey: string; position: number; instruction: string }) {
  const project = await getStickerProject(input.projectKey);
  if (!project) throw new Error("找不到要修改的專案");
  const script = project.scripts.find((item) => item.position === input.position);
  if (!script?.resultUrl) throw new Error(`第 ${input.position} 張尚未完成，無法修改`);
  const current = await signedReference(script.resultUrl, "image/png");
  const job = await createStickerJob({ projectId: project.project.id, scriptId: script.id, kind: "edit", status: "generating", provider: "gpt-image-2" });
  try {
    const result = await generateImage({ prompt: buildRefinementPrompt(input.instruction, input.instruction), originalImages: [current], quality: "medium" });
    if (!result.url) throw new Error("AI 沒有回傳修改後圖片");
    const nextVersion = (await getStickerStudio(input.projectKey))?.jobs.filter((item) => item.scriptId === script.id && item.kind === "edit").length ?? 1;
    await addStickerVersion({ scriptId: script.id, version: nextVersion + 1, url: result.url, mode: "refine" });
    await updateStickerScript({ id: script.id, status: "ready", resultUrl: result.url, errorMessage: null });
    if (job) await updateStickerJob({ id: job.id, status: "completed", checkpointJson: JSON.stringify({ url: result.url }) });
    return { position: input.position, url: result.url, status: "completed" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "貼圖修改失敗";
    if (job) await updateStickerJob({ id: job.id, status: isQuotaError(error) ? "paused_quota" : "failed", errorCode: isQuotaError(error) ? "USAGE_EXHAUSTED" : "EDIT_FAILED", errorMessage: message });
    return { position: input.position, url: script.resultUrl, status: isQuotaError(error) ? "paused_quota" as const : "failed" as const, message };
  }
}
