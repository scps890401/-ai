import { nanoid } from "nanoid";
import { z } from "zod";
import sharp from "sharp";
import { buildFallbackProjectPlan, buildRefinementPrompt, buildStickerPrompt } from "./routers";
import { addStickerAgentEvent, addStickerReference, addStickerScript, addStickerVersion, addStickerAttachments, addStickerMessage, createStickerConversation, createStickerJob, createStickerProject, getLatestStickerConversation, getStickerProject, getStickerStudio, restoreStickerVersion, saveStickerCharacterProfile, saveStickerStyleAnchor, updateStickerJob, updateStickerProject, updateStickerReference, updateStickerScript } from "./db";
import { executeProviderTask, getImageProviderAdapter, getProviderHealthSnapshot, ImageProviderError } from "./imageProviders";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl, storagePut } from "./storage";
import { appendRouterAttempt, buildReferenceSelection, classifyImageError, evaluateStickerQuality, inferAttachmentRole, routeImageTask, shouldAutoRepair, type AgentReference, type AgentReferenceRole, type RouterDecision } from "./stickerAgent";

const plannerSchema = z.object({
  intent: z.enum(["create_project", "plan_pack", "generate_pending", "retry_sticker", "edit_sticker", "edit_pack", "continue_project", "accept_image", "use_as_style", "use_as_pose", "restore_version", "download_pack", "general" ]),
  reply: z.string().min(1).max(800),
  projectTitle: z.string().min(1).max(160),
  stickerCount: z.number().int().min(8).max(40),
  characterProfile: z.string().min(1).max(2000),
  scripts: z.array(z.object({ position: z.number().int().min(1).max(40), emotion: z.string().min(1).max(80), phrase: z.string().min(1).max(160), scene: z.string().max(300) })).max(40),
  targetPosition: z.number().int().min(0).max(40),
  targetVersion: z.number().int().min(0).max(99).default(0),
  editInstruction: z.string().max(500),
});

type StudioPlan = z.infer<typeof plannerSchema>;
type IncomingAttachment = { dataUrl: string; fileName: string; mimeType: string };
type CharacterAnchor = { summary: string; referenceUrls: string[]; version: number; updatedAt: string };
type StyleAnchor = { summary: string; referenceUrls: string[]; version: number; updatedAt: string };

const e2eImageMode = () => process.env.STICKER_E2E_TEST_MODE === "1";

async function createE2ETransparentPng() {
  return sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 239, g: 152, b: 58, alpha: 0 } } })
    .composite([{ input: Buffer.from("<svg width=\"512\" height=\"512\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"256\" cy=\"250\" r=\"190\" fill=\"#f6a33e\"/><circle cx=\"190\" cy=\"220\" r=\"26\" fill=\"#162d45\"/><circle cx=\"322\" cy=\"220\" r=\"26\" fill=\"#162d45\"/><path d=\"M190 330 Q256 380 322 330\" stroke=\"#162d45\" stroke-width=\"18\" fill=\"none\" stroke-linecap=\"round\"/></svg>") }])
    .png().toBuffer();
}

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

function parseCharacterAnchor(value: string | null | undefined): CharacterAnchor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<CharacterAnchor>;
    if (typeof parsed.summary === "string") {
      return {
        summary: parsed.summary,
        referenceUrls: Array.isArray(parsed.referenceUrls) ? parsed.referenceUrls.filter((url): url is string => typeof url === "string") : [],
        version: typeof parsed.version === "number" ? parsed.version : 1,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      };
    }
  } catch { /* Legacy plain-text profiles are normalized below. */ }
  return { summary: value, referenceUrls: [], version: 1, updatedAt: new Date(0).toISOString() };
}

function selectCharacterReferences(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean))).slice(0, 4);
}

function parseStyleAnchor(value: string | null | undefined): StyleAnchor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<StyleAnchor>;
    if (typeof parsed.summary === "string") return { summary: parsed.summary, referenceUrls: Array.isArray(parsed.referenceUrls) ? parsed.referenceUrls.filter((url): url is string => typeof url === "string") : [], version: typeof parsed.version === "number" ? parsed.version : 1, updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString() };
  } catch { /* Legacy style summary is normalized below. */ }
  return { summary: value, referenceUrls: [], version: 1, updatedAt: new Date(0).toISOString() };
}

async function signedReference(url: string, mimeType = "image/jpeg") {
  if (/^https?:\/\//.test(url)) return { url, mimeType };
  if (!url.startsWith("/manus-storage/")) throw new Error("角色參考圖網址無法辨識");
  return { url: await storageGetSignedUrl(url.replace(/^\/manus-storage\//, "")), mimeType };
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function recordAgentEvent(input: { projectId: number; jobId?: number | null; kind: string; status: string; message: string; detail?: Record<string, unknown> }) {
  try {
    await addStickerAgentEvent({ ...input, detailJson: input.detail ? JSON.stringify(input.detail) : null });
  } catch (error) {
    console.warn("[Sticker Agent] 無法寫入工作事件", error);
  }
}

function toAgentReferences(references: Array<{ url: string; role?: string | null; priority?: number | null; accepted?: boolean | null }>): AgentReference[] {
  return references.map((reference) => ({
    url: reference.url,
    role: (["character", "pose", "scene", "style", "accepted_character", "accepted_style", "current_edit"].includes(reference.role ?? "") ? reference.role : "character") as AgentReferenceRole,
    priority: reference.priority ?? 50,
    accepted: Boolean(reference.accepted),
    source: "upload",
  }));
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
  const restoreMatch = message.match(/(?:回復|回到|還原).{0,12}(?:V|版本)\s*(\d+)/i);
  const intent = restoreMatch ? "restore_version" as const
    : /照這個風格|設為風格|全部照這個/i.test(message) ? "use_as_style" as const
    : /我喜歡這張|這張最像|最像我的|確認角色|設為角色|接受這張|就用這張/i.test(message) ? "accept_image" as const
    : /姿勢參考|用這個姿勢|照這個動作/i.test(message) ? "use_as_pose" as const
    : /下載全部|下載套組|下載 ZIP/i.test(message) ? "download_pack" as const
    : /繼續製作|繼續生成/.test(message) ? "continue_project" as const
    : /(?:全部|整套|所有).*(?:改|變|去背|透明|可愛|風格|表情|文字)|(?:改|變|去背|透明|可愛|風格|表情|文字).*(?:全部|整套|所有)/i.test(message) ? "edit_pack" as const
    : /修改|第\s*\d+\s*張/.test(message) ? "edit_sticker" as const
    : /幫我|做成|製作|生成|開始/.test(message) ? "generate_pending" as const
    : "plan_pack" as const;
  return {
    intent,
    reply: fallback.fallbackMessage,
    projectTitle: fallback.title,
    stickerCount,
    characterProfile: fallback.characterProfile,
    scripts: fallback.scripts,
    targetPosition: Number(message.match(/第\s*(\d+)\s*張/)?.[1] ?? 0),
    targetVersion: Number(restoreMatch?.[1] ?? 0),
    editInstruction: message,
  };
}

async function createPlan(message: string, referenceUrls: string[], existingCharacterProfile?: string) {
  try {
    const visionContent = await Promise.all(referenceUrls.slice(0, 4).map(async (url) => ({ type: "image_url" as const, image_url: { url: (await signedReference(url)).url, detail: "high" as const } })));
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: `你是 LINE 貼圖工作室的中文創作 Agent。使用者只用自然語言操作。分析需求與參考圖片，輸出務實 JSON 計畫。只有明確要求生成、繼續或重試才設定 generate_pending、continue_project 或 retry_sticker；使用者指定「全部」、「整套」或「所有貼圖」的修改時設定 edit_pack；使用者確認圖片可用 accept_image，指定「以後照這個」可用 use_as_style，指定姿勢可用 use_as_pose，要求 V2／V3 回復可用 restore_version，要求下載整套可用 download_pack。若有圖片，角色設定必須涵蓋外觀、服裝或毛色、配件、比例、畫風與不可變特徵。貼圖腳本應為日常繁體中文、動作多樣、適合訊息溝通。${existingCharacterProfile ? `\n已確認的角色設定如下，除非使用者上傳新角色照片並明確要求重設，後續對話必須保留這些不可變特徵：${existingCharacterProfile}` : ""}` },
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
              intent: { type: "string", enum: ["create_project", "plan_pack", "generate_pending", "retry_sticker", "edit_sticker", "edit_pack", "continue_project", "accept_image", "use_as_style", "use_as_pose", "restore_version", "download_pack", "general"] },
              reply: { type: "string" }, projectTitle: { type: "string" }, stickerCount: { type: "integer" }, characterProfile: { type: "string" },
              scripts: { type: "array", items: { type: "object", properties: { position: { type: "integer" }, emotion: { type: "string" }, phrase: { type: "string" }, scene: { type: "string" } }, required: ["position", "emotion", "phrase", "scene"], additionalProperties: false } },
              targetPosition: { type: "integer" }, targetVersion: { type: "integer" }, editInstruction: { type: "string" },
            },
            required: ["intent", "reply", "projectTitle", "stickerCount", "characterProfile", "scripts", "targetPosition", "targetVersion", "editInstruction"], additionalProperties: false,
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
  const existing = await getLatestStickerConversation(projectId);
  if (existing) return existing;
  const conversation = await createStickerConversation(projectId);
  if (!conversation) throw new Error("無法建立對話工作階段");
  return conversation;
}

export async function sendStudioMessage(input: { projectKey?: string; content: string; attachments: IncomingAttachment[] }) {
  const project = await createProjectIfNeeded(input.projectKey, input.content);
  const conversation = await ensureConversation(project.id);
  const before = await getStickerStudio(project.projectKey);
  const previousAnchor = parseCharacterAnchor(before?.characterProfile?.profileJson ?? project.characterProfile);
  const previousStyle = parseStyleAnchor(before?.styleAnchor?.summaryJson);
  const userMessage = await addStickerMessage({ conversationId: conversation.id, role: "user", content: input.content });
  if (!userMessage) throw new Error("無法保存你的訊息");
  await recordAgentEvent({ projectId: project.id, kind: "intent", status: "working", message: "正在理解你的需求與附件用途。" });
  const attachmentRows = await persistAttachments(project.id, userMessage.id, input.attachments);
  const attachmentRole = inferAttachmentRole(input.content);
  for (const attachment of attachmentRows.filter((item) => item.mimeType.startsWith("image/"))) {
    await addStickerReference({ projectId: project.id, url: attachment.url, fileName: attachment.fileName, sortOrder: attachment.sortOrder, role: attachmentRole, priority: attachmentRole === "character" ? 20 : attachmentRole === "pose" ? 60 : 70, metadataJson: JSON.stringify({ source: "upload", requestedBy: attachmentRole }) });
  }
  const existing = await getStickerProject(project.projectKey);
  const newReferenceUrls = attachmentRows.filter((item) => item.mimeType.startsWith("image/")).map((item) => item.url);
  const orderedReferences = buildReferenceSelection({ references: [
    ...toAgentReferences(existing?.references ?? []),
    ...(previousAnchor?.referenceUrls ?? []).map((url) => ({ url, role: "accepted_character" as const, priority: 10, accepted: true, source: "anchor" as const })),
    ...(previousStyle?.referenceUrls ?? []).map((url) => ({ url, role: "accepted_style" as const, priority: 40, accepted: true, source: "anchor" as const })),
  ], maxReferences: 4 });
  const selectedReferenceUrls = selectCharacterReferences([...newReferenceUrls, ...orderedReferences.map((reference) => reference.url)]);
  if (selectedReferenceUrls.length) {
    try {
      const analyzable = await Promise.all(selectedReferenceUrls.map(async (url) => signedReference(url)));
      const analysis = await getImageProviderAdapter("gpt-image-2").analyze({ references: analyzable });
      await recordAgentEvent({ projectId: project.id, kind: "reference_analysis", status: analysis.readable === analysis.inspected ? "completed" : "needs_attention", message: `已分析 ${analysis.readable}/${analysis.inspected} 張參考圖的可讀性與透明背景。`, detail: analysis });
    } catch (error) {
      await recordAgentEvent({ projectId: project.id, kind: "reference_analysis", status: "needs_attention", message: "部分參考圖暫時無法分析，但已保存並會在生成時重新讀取。", detail: { error: error instanceof Error ? error.message.slice(0, 160) : "unknown" } });
    }
  }
  const plan = await createPlan(input.content, selectedReferenceUrls, previousAnchor?.summary);
  const preserveCharacter = Boolean(previousAnchor && newReferenceUrls.length === 0);
  const nextAnchor: CharacterAnchor = preserveCharacter
    ? previousAnchor!
    : { summary: plan.characterProfile, referenceUrls: selectedReferenceUrls, version: (previousAnchor?.version ?? 0) + 1, updatedAt: new Date().toISOString() };
  await updateStickerProject({ id: project.id, title: preserveCharacter ? project.title : plan.projectTitle, brief: preserveCharacter ? project.brief : input.content, characterProfile: nextAnchor.summary, stickerCount: preserveCharacter ? project.stickerCount : plan.stickerCount });
  const character = await saveStickerCharacterProfile({ projectId: project.id, profileJson: JSON.stringify(nextAnchor), anchorUrl: nextAnchor.referenceUrls[0], status: nextAnchor.referenceUrls.length ? "ready" : "needs_reference" });
  await recordAgentEvent({ projectId: project.id, kind: "character_anchor", status: nextAnchor.referenceUrls.length ? "completed" : "needs_reference", message: nextAnchor.referenceUrls.length ? "已建立可續作的角色設定與參考圖錨點。" : "尚未收到角色照片；會先依文字需求建立角色設定。", detail: { anchorVersion: nextAnchor.version, references: nextAnchor.referenceUrls.length } });
  if (plan.intent === "use_as_style") {
    const styleUrls = newReferenceUrls.length ? newReferenceUrls : previousStyle?.referenceUrls ?? [];
    const styleAnchor: StyleAnchor = { summary: `使用者確認：${input.content.slice(0, 500)}`, referenceUrls: styleUrls, version: (previousStyle?.version ?? 0) + 1, updatedAt: new Date().toISOString() };
    await saveStickerStyleAnchor({ projectId: project.id, summaryJson: JSON.stringify(styleAnchor), anchorUrl: styleUrls[0] ?? null, status: styleUrls.length ? "ready" : "text_only" });
    await recordAgentEvent({ projectId: project.id, kind: "style_anchor", status: "completed", message: "已將這個風格加入後續貼圖的風格錨點。", detail: { references: styleUrls.length } });
  }
  if (plan.scripts.length && !(existing?.scripts.length)) {
    await recordAgentEvent({ projectId: project.id, kind: "planning", status: "completed", message: `已規劃 ${plan.scripts.slice(0, plan.stickerCount).length} 張貼圖內容。` });
    const health = await providerHealthSnapshot();
    for (const script of plan.scripts.slice(0, plan.stickerCount)) {
      const row = await addStickerScript({ projectId: project.id, ...script, planJson: JSON.stringify({ ...script, generationStatus: "queued" }) });
      if (row) {
        const decision = routeImageTask({ taskKind: "generate", references: orderedReferences, providerHealth: health, requirements: { requiresHighConsistency: orderedReferences.length > 0, requiresText: Boolean(script.phrase), batchSize: plan.stickerCount, speedPriority: plan.stickerCount >= 16 ? "high" : "balanced", costPriority: plan.stickerCount >= 24 ? "high" : "balanced" } });
        await createStickerJob({ projectId: project.id, scriptId: row.id, kind: "generate", status: "queued", provider: decision.selectedProvider, routerJson: JSON.stringify(decision) });
      }
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
  if (plan.intent === "edit_pack") {
    try {
      const queued = await queueStudioPackEdit({ projectKey: project.projectKey, instruction: plan.editInstruction || input.content });
      reply = queued.scheduled.length ? `已將 ${queued.scheduled.length} 張需要更新的貼圖排入整套修改；每張會建立獨立新版，完成後可分別回復。` : "目前沒有需要套用這項整套修改的已完成貼圖。";
    } catch (error) {
      reply = `我已記錄整套修改要求，但暫時無法排程：${error instanceof Error ? error.message : "請稍後再試"}`;
    }
  }
  if (plan.intent === "accept_image") {
    const target = (plan.targetPosition ? existing?.scripts.find((script) => script.position === plan.targetPosition) : existing?.scripts.find((script) => script.resultUrl)) ?? undefined;
    if (target?.resultUrl) {
      await addStickerReference({ projectId: project.id, url: target.resultUrl, fileName: `accepted-sticker-${String(target.position).padStart(2, "0")}.png`, sortOrder: 0, role: "accepted_character", priority: 10, accepted: true, metadataJson: JSON.stringify({ source: "sticker_version", position: target.position }) });
      reply = `已將第 ${target.position} 張設為已確認的角色參考；後續生成會優先保留它的外觀與比例。`;
    } else if (newReferenceUrls.length) {
      for (const reference of existing?.references.filter((reference) => newReferenceUrls.includes(reference.url)) ?? []) await updateStickerReference({ id: reference.id, role: "accepted_character", priority: 10, accepted: true });
      reply = "已將你剛上傳的圖片設為角色錨點；後續貼圖會優先參考它。";
    }
  }
  if (plan.intent === "restore_version" && plan.targetPosition > 0 && plan.targetVersion > 0) {
    const script = existing?.scripts.find((item) => item.position === plan.targetPosition);
    const version = script ? before?.versions?.find((item) => item.scriptId === script.id && item.version === plan.targetVersion) : undefined;
    const restored = version && script ? await restoreStickerVersion({ scriptId: script.id, versionId: version.id }) : undefined;
    reply = restored ? `已回復第 ${plan.targetPosition} 張的 V${restored.version}，其他版本仍會完整保留。` : `找不到第 ${plan.targetPosition} 張的 V${plan.targetVersion}；請先在版本記錄確認可回復版本。`;
  }
  const assistant = await addStickerMessage({ conversationId: conversation.id, role: "assistant", content: reply, intentJson: JSON.stringify(plan) });
  return { projectKey: project.projectKey, intent: plan.intent, reply, character, assistantMessageId: assistant?.id, autoRun: plan.intent === "generate_pending" || plan.intent === "continue_project" || plan.intent === "edit_pack" || (plan.scripts.length > 0 && /幫我|做成|製作|生成|開始/.test(input.content)) };
}

async function storeGeneratedDraft(b64Json: string, mimeType: string) {
  const buffer = Buffer.from(b64Json, "base64");
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  return storagePut(`generated/studio-draft-${Date.now()}-${nanoid(8)}.${extension}`, buffer, mimeType);
}

async function storeTransparentPng(b64Json: string) {
  const normalized = await sharp(Buffer.from(b64Json, "base64")).ensureAlpha().png().toBuffer();
  const metadata = await sharp(normalized).metadata();
  const saved = await storagePut(`generated/studio-${Date.now()}-${nanoid(8)}.png`, normalized, "image/png");
  return { ...saved, hasAlpha: metadata.hasAlpha === true, buffer: normalized };
}

async function providerHealthSnapshot() {
  try { return await getProviderHealthSnapshot(); } catch { return undefined; }
}

async function executeWithRouter(input: { taskKind: "generate" | "edit" | "cutout"; prompt: string; references: Array<{ url: string; mimeType: string }>; currentImage?: { url: string; mimeType: string }; decision: RouterDecision }) {
  let decision = input.decision;
  let lastError: unknown = new Error("沒有健康且已設定的圖像 Provider");
  const enabledCandidates = decision.candidates.filter((item) => item.enabled);
  if (enabledCandidates.length === 0 && decision.candidates.some((item) => item.healthStatus === "quota_exhausted")) {
    throw Object.assign(new ImageProviderError("gpt-image-2", "quota", "所有已設定的圖像 Provider 目前 quota exhausted；任務已保存。", true), { routerDecision: decision });
  }
  for (const candidate of enabledCandidates) {
    try {
      const result = await executeProviderTask({ provider: candidate.provider, taskKind: input.taskKind, prompt: input.prompt, references: input.references, currentImage: input.currentImage });
      decision = appendRouterAttempt(decision, { provider: candidate.provider, startedAt: new Date().toISOString(), outcome: "completed" });
      return { result, provider: candidate.provider, decision };
    } catch (error) {
      lastError = error;
      const classified = classifyImageError(error);
      decision = appendRouterAttempt(decision, { provider: candidate.provider, startedAt: new Date().toISOString(), outcome: classified.kind === "quota" ? "paused" : "failed", errorKind: classified.kind, message: classified.message });
      if (!classified.fallbackEligible) break;
    }
  }
  throw Object.assign(lastError instanceof Error ? lastError : new Error(String(lastError)), { routerDecision: decision });
}

async function generateDraftWithRouter(input: { prompt: string; references: Array<{ url: string; mimeType: string }>; decision: RouterDecision }) {
  const routed = await executeWithRouter({ taskKind: "generate", prompt: input.prompt, references: input.references, decision: input.decision });
  const draft = await storeGeneratedDraft(routed.result.b64Json, routed.result.mimeType);
  return { draft, provider: routed.provider, decision: routed.decision, geminiInteractionId: routed.result.interactionId };
}

export async function runPendingStudioJobs(projectKey: string, maxJobs = 2, position?: number) {
  const studio = await getStickerStudio(projectKey);
  if (!studio) throw new Error("找不到要繼續的專案");
  const references = (await getStickerProject(projectKey))?.references ?? [];
  const anchor = parseCharacterAnchor(studio.characterProfile?.profileJson ?? studio.project.characterProfile);
  const styleAnchor = parseStyleAnchor(studio.styleAnchor?.summaryJson);
  const profile = anchor?.summary ?? "請維持所有角色外觀特徵一致";
  const candidates = studio.jobs.filter((job) => {
    if (job.kind !== "generate" || !["queued", "retrying", "paused_quota"].includes(job.status)) return false;
    return position === undefined || studio.scripts.find((script) => script.id === job.scriptId)?.position === position;
  }).slice(0, maxJobs);
  const completed = [] as Array<{ jobId: number; scriptId: number | null; status: string; url?: string; message?: string }>;
  for (const job of candidates) {
    const script = studio.scripts.find((item) => item.id === job.scriptId);
    if (!script) continue;
    const seededReferences: AgentReference[] = [
      ...toAgentReferences(references),
      ...(anchor?.referenceUrls ?? []).map((url) => ({ url, role: "accepted_character" as const, priority: 10, accepted: true, source: "anchor" as const })),
      ...(styleAnchor?.referenceUrls ?? []).map((url) => ({ url, role: "accepted_style" as const, priority: 40, accepted: true, source: "anchor" as const })),
    ];
    const storedRouter = safeJson<RouterDecision | null>(job.routerJson, null);
    const health = await providerHealthSnapshot();
    const refreshedDecision = routeImageTask({ taskKind: "generate", references: seededReferences, providerHealth: health, requirements: { requiresHighConsistency: seededReferences.length > 0, requiresText: Boolean(script.phrase), batchSize: studio.project.stickerCount, speedPriority: studio.project.stickerCount >= 16 ? "high" : "balanced", costPriority: studio.project.stickerCount >= 24 ? "high" : "balanced" } });
    let routerDecision: RouterDecision = storedRouter ? { ...refreshedDecision, attempts: [...storedRouter.attempts, ...refreshedDecision.attempts] } : refreshedDecision;
    const selectedReferences = buildReferenceSelection({ references: routerDecision.referenceSnapshot.length ? routerDecision.referenceSnapshot : seededReferences, maxReferences: 4 });
    const referenceUrls = selectedReferences.map((reference) => reference.url);
    await updateStickerJob({ id: job.id, status: "generating", attempt: job.attempt + 1, provider: routerDecision.selectedProvider, errorCode: null, errorMessage: null, routerJson: JSON.stringify(routerDecision) });
    await updateStickerScript({ id: script.id, status: "generating", errorMessage: null, planJson: JSON.stringify({ ...safeJson<Record<string, unknown>>(script.planJson, {}), generationStatus: "generating", referenceCount: referenceUrls.length }) });
    await recordAgentEvent({ projectId: studio.project.id, jobId: job.id, kind: "generation", status: "working", message: `正在生成第 ${script.position} 張貼圖。`, detail: { position: script.position, provider: routerDecision.selectedProvider, references: referenceUrls.length } });
    const prompt = buildStickerPrompt({ style: styleAnchor?.summary || "可愛、清晰、適合日常溝通的 LINE 貼圖", emotion: script.emotion, phrase: script.phrase, scene: script.scene ?? undefined, characterProfile: profile, prompt: "使用乾淨的淺色背景與約 10 像素安全邊距。不要直接生成文字；最終繁體中文字將由程式後製。" });
    try {
      const checkpoint = safeJson<{ draftUrl?: string; referenceUrls?: string[]; geminiInteractionId?: string; draftProvider?: string; routerDecision?: RouterDecision; qualityAttempt?: number }>(job.checkpointJson, {});
      let draftUrl = checkpoint.draftUrl;
      let draftProvider = checkpoint.draftProvider ?? routerDecision.selectedProvider ?? "unknown";
      if (!draftUrl) {
        const referenceImages = await Promise.all(referenceUrls.map(async (url) => ({ ...(await signedReference(url)), mimeType: "image/jpeg" })));
        const routed = await generateDraftWithRouter({ prompt, references: referenceImages, decision: routerDecision });
        draftUrl = routed.draft.url;
        draftProvider = routed.provider;
        routerDecision = routed.decision;
        checkpoint.geminiInteractionId = routed.geminiInteractionId;
        await updateStickerJob({ id: job.id, status: "removing_background", provider: draftProvider, routerJson: JSON.stringify(routerDecision), checkpointJson: JSON.stringify({ ...checkpoint, draftUrl, referenceUrls, stage: "removing_background", draftProvider, routerDecision }) });
        await recordAgentEvent({ projectId: studio.project.id, jobId: job.id, kind: "background", status: "working", message: `第 ${script.position} 張已完成草稿，正在整理透明背景。`, detail: { provider: draftProvider } });
      }
      const draftReference = await signedReference(draftUrl, "image/jpeg");
      let cutoutB64: string;
      let cutoutProvider = "gpt-image-2";
      let cutoutRouter: RouterDecision | undefined;
      if (e2eImageMode()) {
        cutoutB64 = (await createE2ETransparentPng()).toString("base64");
      } else {
        cutoutRouter = routeImageTask({ taskKind: "cutout", references: seededReferences, providerHealth: health, requirements: { requiresHighConsistency: seededReferences.length > 0, requiresText: false, batchSize: 1, speedPriority: "balanced", costPriority: "balanced" } });
        const routedCutout = await executeWithRouter({ taskKind: "cutout", prompt: "Remove the background from this supplied sticker character. Preserve the same character, pose, proportions, linework and accessories. Return only the character on a transparent background. Do not add any text or objects.", references: [], currentImage: draftReference, decision: cutoutRouter });
        cutoutB64 = routedCutout.result.b64Json;
        cutoutProvider = routedCutout.provider;
        routerDecision = { ...routerDecision, attempts: [...routerDecision.attempts, ...routedCutout.decision.attempts] };
      }
      let saved = await storeTransparentPng(cutoutB64);
      let quality = await evaluateStickerQuality(saved.buffer, { phrase: script.phrase });
      const qualityAttempt = Number(checkpoint.qualityAttempt ?? 0);
      if (shouldAutoRepair(quality, qualityAttempt)) {
        await recordAgentEvent({ projectId: studio.project.id, jobId: job.id, kind: "quality_fix", status: "working", message: `第 ${script.position} 張未通過品質檢查，正在執行一次安全修正。`, detail: { reason: quality.reason, suggestedFix: quality.suggestedFix, qualityAttempt } });
        const repairDecision = routeImageTask({ taskKind: "cutout", references: seededReferences, providerHealth: health, requirements: { requiresHighConsistency: seededReferences.length > 0, requiresText: false, batchSize: 1, speedPriority: "balanced", costPriority: "balanced" } });
        const currentSaved = await signedReference(saved.url, "image/png");
        const repaired = await executeWithRouter({ taskKind: "cutout", prompt: "Fix the supplied sticker image. Preserve the exact character, face, limbs, pose, accessories and linework. Return a complete subject with transparent background and at least 10 pixels of safe margin. Do not add text or objects.", references: [], currentImage: currentSaved, decision: repairDecision });
        saved = await storeTransparentPng(repaired.result.b64Json);
        quality = await evaluateStickerQuality(saved.buffer, { phrase: script.phrase });
        checkpoint.qualityAttempt = qualityAttempt + 1;
        routerDecision = { ...routerDecision, attempts: [...routerDecision.attempts, ...repaired.decision.attempts] };
        await recordAgentEvent({ projectId: studio.project.id, jobId: job.id, kind: "quality_fix", status: quality.verdict === "pass" ? "completed" : "needs_attention", message: quality.verdict === "pass" ? `第 ${script.position} 張已通過自動修正後的品質檢查。` : `第 ${script.position} 張已完成一次安全修正，但仍需人工確認。`, detail: quality });
      }
      const existingVersions = (studio.versions ?? []).filter((version) => version.scriptId === script.id);
      const parentVersion = existingVersions.find((version) => version.isActive) ?? existingVersions.at(-1);
      const nextVersion = Math.max(0, ...existingVersions.map((version) => version.version)) + 1;
      const providerChain = `${draftProvider}+${cutoutProvider}`;
      await updateStickerScript({ id: script.id, status: "ready", resultUrl: saved.url, errorMessage: null, qualityReport: JSON.stringify({ ...quality, provider: providerChain }), planJson: JSON.stringify({ ...safeJson<Record<string, unknown>>(script.planJson, {}), generationStatus: "ready" }) });
      await addStickerVersion({ scriptId: script.id, version: nextVersion, url: saved.url, mode: nextVersion === 1 ? "generate" : "retry", parentVersionId: parentVersion?.id ?? null, qualityReportJson: JSON.stringify(quality), provider: providerChain });
      routerDecision = appendRouterAttempt(routerDecision, { provider: draftProvider as RouterDecision["selectedProvider"] extends infer T ? Exclude<T, null> : never, startedAt: new Date().toISOString(), outcome: "completed" });
      await updateStickerJob({ id: job.id, status: "completed", provider: providerChain, routerJson: JSON.stringify(routerDecision), qualityReportJson: JSON.stringify(quality), checkpointJson: JSON.stringify({ ...checkpoint, draftUrl, url: saved.url, referenceUrls, stage: "completed", draftProvider, cutoutProvider, cutoutRouter, routerDecision }) });
      await recordAgentEvent({ projectId: studio.project.id, jobId: job.id, kind: "quality", status: quality.outputReady ? "completed" : "needs_attention", message: `第 ${script.position} 張已完成${quality.outputReady ? "並通過基本品質檢查" : "，但需要人工確認"}。`, detail: quality });
      completed.push({ jobId: job.id, scriptId: script.id, status: "completed", url: saved.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "貼圖生成失敗";
      const routedDecision = (error as Error & { routerDecision?: RouterDecision }).routerDecision;
      if (routedDecision) routerDecision = routedDecision;
      const classified = classifyImageError(error);
      const paused = classified.kind === "quota";
      const checkpoint = safeJson<Record<string, unknown>>(job.checkpointJson, {});
      const checkpointJson = JSON.stringify({ ...checkpoint, referenceUrls, routerDecision, stage: paused ? "paused_quota" : "failed", position: script.position, resumeCommand: paused ? "繼續製作" : undefined });
      await updateStickerJob({ id: job.id, status: paused ? "paused_quota" : "failed", errorCode: paused ? "USAGE_EXHAUSTED" : classified.kind === "policy" ? "POLICY_REJECTED" : "GENERATION_FAILED", errorMessage: message, checkpointJson, routerJson: JSON.stringify(routerDecision) });
      await updateStickerScript({ id: script.id, status: paused ? "queued" : "error", errorMessage: message, planJson: JSON.stringify({ ...safeJson<Record<string, unknown>>(script.planJson, {}), generationStatus: paused ? "paused_quota" : "error" }) });
      await recordAgentEvent({ projectId: studio.project.id, jobId: job.id, kind: "generation", status: paused ? "paused_quota" : "failed", message: paused ? `第 ${script.position} 張已保存，等待額度恢復後可繼續。` : `第 ${script.position} 張需要處理：${classified.kind === "policy" ? "請調整需求後再試" : "可單獨重試"}。`, detail: { errorKind: classified.kind } });
      completed.push({ jobId: job.id, scriptId: script.id, status: paused ? "paused_quota" : "failed", message });
      if (paused) break;
    }
  }
  const pendingEdits = studio.jobs.filter((job) => {
    if (job.kind !== "edit" || !["queued", "retrying", "paused_quota"].includes(job.status)) return false;
    const script = studio.scripts.find((item) => item.id === job.scriptId);
    return position === undefined || script?.position === position;
  }).slice(0, Math.max(0, maxJobs - completed.length));
  for (const job of pendingEdits) {
    const checkpoint = job.checkpointJson ? JSON.parse(job.checkpointJson) as { instruction?: string; position?: number } : {};
    const script = studio.scripts.find((item) => item.id === job.scriptId);
    const targetPosition = checkpoint.position ?? script?.position;
    if (!targetPosition || !checkpoint.instruction) continue;
    const resumed = await editStudioSticker({ projectKey, position: targetPosition, instruction: checkpoint.instruction, resumeJobId: job.id });
    completed.push({ jobId: job.id, scriptId: job.scriptId, status: resumed.status, url: resumed.url, message: resumed.message });
    if (resumed.status === "paused_quota") break;
  }
  const refreshed = await getStickerStudio(projectKey);
  const remaining = refreshed?.jobs.filter((job) => ["generate", "edit"].includes(job.kind) && ["queued", "retrying", "paused_quota"].includes(job.status)).length ?? 0;
  return { projectKey, completed, remaining };
}

export async function retryStudioSticker(projectKey: string, position: number) {
  const studio = await getStickerStudio(projectKey);
  if (!studio) throw new Error("找不到要重試的專案");
  const script = studio.scripts.find((item) => item.position === position);
  if (!script) throw new Error(`找不到第 ${position} 張貼圖`);
  let job = studio.jobs.filter((item) => item.scriptId === script.id && item.kind === "generate").at(-1);
  if (job) await updateStickerJob({ id: job.id, status: "retrying", errorCode: null, errorMessage: null });
  else {
    const references = toAgentReferences(studio.references ?? []);
    const decision = routeImageTask({ taskKind: "generate", references, providerHealth: await providerHealthSnapshot(), requirements: { requiresHighConsistency: references.length > 0, requiresText: Boolean(script.phrase), batchSize: studio.project.stickerCount, speedPriority: "balanced", costPriority: "balanced" } });
    job = await createStickerJob({ projectId: studio.project.id, scriptId: script.id, kind: "generate", status: "retrying", provider: decision.selectedProvider, routerJson: JSON.stringify(decision) });
  }
  await updateStickerScript({ id: script.id, status: "queued", errorMessage: null });
  await recordAgentEvent({ projectId: studio.project.id, jobId: job?.id, kind: "retry", status: "queued", message: `已排入第 ${position} 張的單獨重試，不會影響其他貼圖。` });
  if (!job) throw new Error("無法建立重試工作");
  return runPendingStudioJobs(projectKey, 1, position);
}

export async function queueStudioPackEdit(input: { projectKey: string; instruction: string }) {
  const studio = await getStickerStudio(input.projectKey);
  if (!studio) throw new Error("找不到要修改的專案");
  const backgroundOnly = /去背|透明背景|不要背景/i.test(input.instruction);
  const candidates = studio.scripts.filter((script) => {
    if (!script.resultUrl) return false;
    if (!backgroundOnly) return true;
    const quality = safeJson<{ alphaVerified?: boolean; transparentCoverage?: number }>(script.qualityReport, {});
    return !quality.alphaVerified || (quality.transparentCoverage ?? 0) < 0.005;
  });
  const scheduled: number[] = [];
  const skipped: number[] = [];
  for (const script of studio.scripts) {
    if (!script.resultUrl || !candidates.some((item) => item.id === script.id)) { skipped.push(script.position); continue; }
    const blockingGeneration = studio.jobs.find((job) => job.scriptId === script.id && job.kind === "generate" && ["queued", "retrying", "generating", "paused_quota"].includes(job.status));
    if (blockingGeneration) { skipped.push(script.position); continue; }
    const existing = studio.jobs.find((job) => job.scriptId === script.id && job.kind === "edit" && ["queued", "retrying", "generating", "paused_quota"].includes(job.status));
    if (existing) { skipped.push(script.position); continue; }
    const references = toAgentReferences(studio.references ?? []);
    const decision = routeImageTask({ taskKind: "edit", references, currentEditUrl: script.resultUrl, providerHealth: await providerHealthSnapshot(), requirements: { requiresHighConsistency: references.length > 0, requiresText: /文字|改成|謝謝|早安|生日/i.test(input.instruction), batchSize: candidates.length, speedPriority: candidates.length >= 16 ? "high" : "balanced", costPriority: candidates.length >= 24 ? "high" : "balanced" } });
    const job = await createStickerJob({ projectId: studio.project.id, scriptId: script.id, kind: "edit", status: "queued", provider: decision.selectedProvider, routerJson: JSON.stringify(decision), checkpointJson: JSON.stringify({ instruction: input.instruction, position: script.position, stage: "queued", scope: "pack", routerDecision: decision }) });
    await recordAgentEvent({ projectId: studio.project.id, jobId: job?.id, kind: "pack_edit", status: "queued", message: `已排入第 ${script.position} 張的整套修改。`, detail: { instruction: input.instruction, scope: "pack" } });
    scheduled.push(script.position);
  }
  await recordAgentEvent({ projectId: studio.project.id, kind: "pack_edit", status: scheduled.length ? "queued" : "completed", message: scheduled.length ? `已排入 ${scheduled.length} 張貼圖的整套修改；每張會保留獨立版本。` : "目前沒有需要套用這項整套修改的已完成貼圖。", detail: { scheduled, skipped, instruction: input.instruction } });
  return { projectKey: input.projectKey, scheduled, skipped, total: candidates.length };
}

export async function restoreStudioStickerVersion(input: { projectKey: string; position: number; versionId: number }) {
  const studio = await getStickerStudio(input.projectKey);
  if (!studio) throw new Error("找不到要回復版本的專案");
  const script = studio.scripts.find((item) => item.position === input.position);
  if (!script) throw new Error(`找不到第 ${input.position} 張貼圖`);
  const version = (studio.versions ?? []).find((item) => item.id === input.versionId && item.scriptId === script.id);
  if (!version) throw new Error("找不到指定版本，請重新開啟版本記錄後再試");
  const restored = await restoreStickerVersion({ scriptId: script.id, versionId: version.id });
  if (!restored) throw new Error("無法回復指定版本");
  await recordAgentEvent({ projectId: studio.project.id, kind: "restore_version", status: "completed", message: `已回復第 ${input.position} 張的 V${restored.version}。`, detail: { versionId: restored.id } });
  return { position: input.position, url: restored.url, version: restored.version, status: "completed" as const };
}

export async function setStudioReferenceRole(input: { projectKey: string; referenceId: number; role: AgentReferenceRole; accepted: boolean }) {
  const studio = await getStickerStudio(input.projectKey);
  if (!studio) throw new Error("找不到要設定參考圖的專案");
  const reference = (studio.references ?? []).find((item) => item.id === input.referenceId);
  if (!reference) throw new Error("找不到指定參考圖片");
  const priority = input.role === "accepted_character" ? 10 : input.role === "character" ? 20 : input.role === "pose" ? 60 : input.role === "scene" ? 65 : 70;
  const updated = await updateStickerReference({ id: reference.id, role: input.role, accepted: input.accepted, priority, metadataJson: JSON.stringify({ ...safeJson<Record<string, unknown>>(reference.metadataJson, {}), updatedBy: "studio_agent", updatedAt: new Date().toISOString() }) });
  await recordAgentEvent({ projectId: studio.project.id, kind: "reference", status: "completed", message: input.role === "pose" ? "已將圖片設定為姿勢參考。" : input.role === "scene" ? "已將圖片設定為場景參考。" : input.role.includes("style") ? "已將圖片設定為風格參考。" : "已將圖片設定為角色參考。", detail: { referenceId: reference.id, role: input.role, accepted: input.accepted } });
  return updated;
}

export async function editStudioSticker(input: { projectKey: string; position: number; instruction: string; resumeJobId?: number }) {
  const project = await getStickerProject(input.projectKey);
  if (!project) throw new Error("找不到要修改的專案");
  const script = project.scripts.find((item) => item.position === input.position);
  if (!script?.resultUrl) throw new Error(`第 ${input.position} 張尚未完成，無法修改`);
  const current = await signedReference(script.resultUrl, "image/png");
  const studio = await getStickerStudio(input.projectKey);
  const previousJob = input.resumeJobId ? studio?.jobs.find((item) => item.id === input.resumeJobId && item.kind === "edit") : undefined;
  const seededReferences = toAgentReferences(studio?.references ?? project.references);
  const refreshedDecision = routeImageTask({ taskKind: "edit", references: seededReferences, currentEditUrl: script.resultUrl, providerHealth: await providerHealthSnapshot(), requirements: { requiresHighConsistency: seededReferences.length > 0, requiresText: /文字|改成|謝謝|早安|生日/i.test(input.instruction), batchSize: 1, speedPriority: "balanced", costPriority: "balanced" } });
  const storedDecision = previousJob ? safeJson<RouterDecision | null>(previousJob.routerJson, null) : null;
  let routerDecision: RouterDecision = storedDecision ? { ...refreshedDecision, attempts: [...storedDecision.attempts, ...refreshedDecision.attempts] } : refreshedDecision;
  const job = previousJob ?? await createStickerJob({ projectId: project.project.id, scriptId: script.id, kind: "edit", status: "generating", provider: routerDecision.selectedProvider, routerJson: JSON.stringify(routerDecision) });
  if (previousJob) await updateStickerJob({ id: previousJob.id, status: "generating", provider: routerDecision.selectedProvider, errorCode: null, errorMessage: null, routerJson: JSON.stringify(routerDecision) });
  await recordAgentEvent({ projectId: project.project.id, jobId: job?.id, kind: "edit", status: "working", message: `正在修改第 ${input.position} 張貼圖。`, detail: { instruction: input.instruction } });
  try {
    let sourceB64: string;
    let provider: NonNullable<RouterDecision["selectedProvider"]> = "gpt-image-2";
    if (e2eImageMode()) {
      sourceB64 = (await createE2ETransparentPng()).toString("base64");
      routerDecision = appendRouterAttempt(routerDecision, { provider, startedAt: new Date().toISOString(), outcome: "completed" });
    } else {
      const references = buildReferenceSelection({ references: seededReferences, currentEditUrl: script.resultUrl, maxReferences: 4 }).filter((reference) => reference.role !== "current_edit").map(async (reference) => signedReference(reference.url, reference.mimeType ?? "image/jpeg"));
      const routed = await executeWithRouter({ taskKind: "edit", prompt: buildRefinementPrompt(input.instruction, input.instruction), references: await Promise.all(references), currentImage: current, decision: routerDecision });
      sourceB64 = routed.result.b64Json;
      provider = routed.provider;
      routerDecision = routed.decision;
    }
    const saved = await storeTransparentPng(sourceB64);
    const quality = await evaluateStickerQuality(saved.buffer);
    const versions = (studio?.versions ?? []).filter((version) => version.scriptId === script.id);
    const parent = versions.find((version) => version.isActive) ?? versions.at(-1);
    const nextVersion = Math.max(0, ...versions.map((version) => version.version)) + 1;
    await addStickerVersion({ scriptId: script.id, version: nextVersion, url: saved.url, mode: "refine", parentVersionId: parent?.id ?? null, qualityReportJson: JSON.stringify(quality), provider });
    await updateStickerScript({ id: script.id, status: "ready", resultUrl: saved.url, errorMessage: null, qualityReport: JSON.stringify(quality) });
    if (job) await updateStickerJob({ id: job.id, status: "completed", provider, routerJson: JSON.stringify(routerDecision), qualityReportJson: JSON.stringify(quality), checkpointJson: JSON.stringify({ originalUrl: script.resultUrl, instruction: input.instruction, position: input.position, url: saved.url, stage: "completed", routerDecision }) });
    await recordAgentEvent({ projectId: project.project.id, jobId: job?.id, kind: "edit", status: "completed", message: `第 ${input.position} 張已建立 V${nextVersion}。`, detail: quality });
    return { position: input.position, url: saved.url, status: "completed" as const, version: nextVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : "貼圖修改失敗";
    const classified = classifyImageError(error);
    const paused = classified.kind === "quota";
    if (job) await updateStickerJob({ id: job.id, status: paused ? "paused_quota" : "failed", errorCode: paused ? "USAGE_EXHAUSTED" : classified.kind === "policy" ? "POLICY_REJECTED" : "EDIT_FAILED", errorMessage: message, routerJson: JSON.stringify(routerDecision), checkpointJson: JSON.stringify({ originalUrl: script.resultUrl, instruction: input.instruction, position: input.position, stage: paused ? "paused_quota" : "failed", resumeCommand: paused ? "繼續製作" : undefined, routerDecision }) });
    await recordAgentEvent({ projectId: project.project.id, jobId: job?.id, kind: "edit", status: paused ? "paused_quota" : "failed", message: paused ? `第 ${input.position} 張的修改已保存，額度恢復後可繼續。` : `第 ${input.position} 張修改未完成，原版仍已保留。`, detail: { errorKind: classified.kind } });
    return { position: input.position, url: script.resultUrl, status: paused ? "paused_quota" as const : "failed" as const, message };
  }
}
