import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const memory = vi.hoisted(() => ({
  project: null as any,
  conversation: null as any,
  messages: [] as any[],
  attachments: [] as any[],
  references: [] as any[],
  profile: null as any,
  styleAnchor: null as any,
  scripts: [] as any[],
  jobs: [] as any[],
  versions: [] as any[],
  events: [] as any[],
  exports: [] as any[],
  imageDataUrl: "",
  opaqueImageDataUrl: "",
  forceQuota: false,
  forceQualityFail: false,
  cutoutCalls: 0,
  nextId: 1,
}));

vi.mock("./db", () => ({
  createStickerProject: vi.fn(async (input: any) => (memory.project = { id: 1, ...input, createdAt: new Date(), updatedAt: new Date() })),
  getStickerProject: vi.fn(async (projectKey: string) => memory.project?.projectKey === projectKey ? { project: memory.project, references: memory.references, scripts: memory.scripts } : undefined),
  updateStickerProject: vi.fn(async (input: any) => Object.assign(memory.project, input)),
  createStickerConversation: vi.fn(async (projectId: number) => (memory.conversation = { id: 1, projectId, status: "active", lastActiveAt: new Date(), createdAt: new Date() })),
  getLatestStickerConversation: vi.fn(async () => memory.conversation),
  addStickerMessage: vi.fn(async (input: any) => { const row = { id: memory.nextId++, ...input, intentJson: input.intentJson ?? null, createdAt: new Date() }; memory.messages.push(row); return row; }),
  addStickerAttachments: vi.fn(async (rows: any[]) => { const saved = rows.map((row) => ({ id: memory.nextId++, ...row, createdAt: new Date() })); memory.attachments.push(...saved); return saved; }),
  addStickerReference: vi.fn(async (input: any) => { const row = { id: memory.nextId++, ...input, createdAt: new Date() }; memory.references.push(row); return row; }),
  updateStickerReference: vi.fn(async (input: any) => { const row = memory.references.find((item) => item.id === input.id); Object.assign(row, input); return row; }),
  saveStickerCharacterProfile: vi.fn(async (input: any) => (memory.profile = { id: 1, ...input, createdAt: new Date(), updatedAt: new Date() })),
  saveStickerStyleAnchor: vi.fn(async (input: any) => (memory.styleAnchor = { id: memory.nextId++, ...input, createdAt: new Date(), updatedAt: new Date() })),
  addStickerScript: vi.fn(async (input: any) => { const row = { id: memory.nextId++, ...input, status: "draft", resultUrl: null, errorMessage: null, qualityReport: null, updatedAt: new Date() }; memory.scripts.push(row); return row; }),
  createStickerJob: vi.fn(async (input: any) => { const row = { id: memory.nextId++, scriptId: input.scriptId ?? null, status: input.status ?? "queued", attempt: input.attempt ?? 0, provider: input.provider ?? null, errorCode: null, errorMessage: null, checkpointJson: input.checkpointJson ?? null, createdAt: new Date(), updatedAt: new Date(), ...input }; memory.jobs.push(row); return row; }),
  updateStickerJob: vi.fn(async (input: any) => { const row = memory.jobs.find((item) => item.id === input.id); Object.assign(row, input, { updatedAt: new Date() }); return row; }),
  updateStickerScript: vi.fn(async (input: any) => { const row = memory.scripts.find((item) => item.id === input.id); Object.assign(row, input, { updatedAt: new Date() }); return row; }),
  addStickerAgentEvent: vi.fn(async (input: any) => { const row = { id: memory.nextId++, ...input, createdAt: new Date() }; memory.events.push(row); return row; }),
  addStickerVersion: vi.fn(async (input: any) => { if (input.isActive ?? true) memory.versions.filter((item) => item.scriptId === input.scriptId).forEach((item) => { item.isActive = false; }); const row = { id: memory.nextId++, isActive: input.isActive ?? true, ...input, createdAt: new Date() }; memory.versions.push(row); return row; }),
  restoreStickerVersion: vi.fn(async (input: any) => { const row = memory.versions.find((item) => item.id === input.versionId && item.scriptId === input.scriptId); if (!row) return undefined; memory.versions.filter((item) => item.scriptId === input.scriptId).forEach((item) => { item.isActive = false; }); row.isActive = true; const script = memory.scripts.find((item) => item.id === input.scriptId); if (script) Object.assign(script, { status: "ready", resultUrl: row.url, errorMessage: null }); return row; }),
  addStickerExport: vi.fn(async (input: any) => { const row = { id: memory.nextId++, ...input, createdAt: new Date() }; memory.exports.push(row); return row; }),
  getStickerStudio: vi.fn(async (projectKey: string) => memory.project?.projectKey === projectKey ? ({ project: memory.project, conversation: memory.conversation, messages: memory.messages, attachments: memory.attachments, characterProfile: memory.profile, styleAnchor: memory.styleAnchor, references: memory.references, scripts: memory.scripts, versions: memory.versions, jobs: memory.jobs, events: memory.events, exports: memory.exports }) : undefined),
  getDb: vi.fn(),
}));

vi.mock("./storage", () => ({
  storageGetSignedUrl: vi.fn(async (key: string) => key.startsWith("data:") ? key : memory.imageDataUrl),
  storagePut: vi.fn(async () => ({ key: "test", url: "/manus-storage/test.png" })),
}));

vi.mock("./geminiImage", () => ({
  GeminiImageError: class GeminiImageError extends Error { constructor(message: string, public code?: string) { super(message); } },
  generateGeminiImage: vi.fn(async () => { if (memory.forceQuota) throw new (class GeminiImageError extends Error { constructor() { super("usage exhausted"); this.code = "USAGE_EXHAUSTED"; } code: string })(); return { b64Json: memory.imageDataUrl.split(",")[1], mimeType: "image/jpeg", provider: "gemini", interactionId: "gemini-test-interaction" }; }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn(async () => { if (memory.forceQuota) throw new Error("usage exhausted"); return { b64Json: memory.imageDataUrl.split(",")[1], url: memory.imageDataUrl, hasAlpha: true }; }),
}));

vi.mock("./imageProviders", () => ({
  getProviderHealthSnapshot: vi.fn(async () => ({
    "gemini-3.1-flash-image": { provider: "gemini-3.1-flash-image", status: memory.forceQuota ? "quota_exhausted" : "healthy", configured: true, supports: ["generate", "edit"], detail: "test", checkedAt: new Date().toISOString(), latencyMs: 1 },
    "gpt-image-2": { provider: "gpt-image-2", status: memory.forceQuota ? "quota_exhausted" : "healthy", configured: true, supports: ["generate", "edit", "cutout"], detail: "test", checkedAt: new Date().toISOString(), latencyMs: 1 },
    "flux-2": { provider: "flux-2", status: "disabled", configured: false, supports: [], detail: "test", checkedAt: new Date().toISOString(), latencyMs: 1 },
  })),
  executeProviderTask: vi.fn(async (input: any) => {
    if (memory.forceQuota) throw new Error("usage exhausted");
    const opaque = memory.forceQualityFail && input.taskKind === "cutout" && memory.cutoutCalls++ === 0;
    return { b64Json: (opaque ? memory.opaqueImageDataUrl : memory.imageDataUrl).split(",")[1], mimeType: "image/png", provider: input.provider, interactionId: input.provider === "gemini-3.1-flash-image" ? "gemini-test-interaction" : undefined };
  }),
  ImageProviderError: class ImageProviderError extends Error { constructor(_provider: string, _kind: string, message: string) { super(message); } },
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async (input: any) => {
    const user = input.messages?.find((message: any) => message.role === "user")?.content;
    const text = typeof user === "string" ? user : Array.isArray(user) ? user.map((item) => item.text ?? "").join(" ") : "";
    const packEdit = /全部變可愛|全部去背|整套修改/.test(text);
    return { choices: [{ message: { content: JSON.stringify({ intent: packEdit ? "edit_pack" : "generate_pending", reply: packEdit ? "我會為需要更新的貼圖建立獨立新版。" : "已建立 8 張貼圖規劃。", projectTitle: "橘貓日常", stickerCount: 8, characterProfile: "橘色短毛貓，圓眼睛，深藍圍裙；所有貼圖維持相同毛色、圍裙與比例。", scripts: packEdit ? [] : Array.from({ length: 8 }, (_, index) => ({ position: index + 1, emotion: "日常", phrase: `文字${index + 1}`, scene: "可愛日常姿勢" })), targetPosition: 0, targetVersion: 0, editInstruction: packEdit ? text : "" }) } }] };
  }),
}));

const { appRouter } = await import("./routers");

function caller() {
  const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
  return appRouter.createCaller(ctx);
}

beforeEach(async () => {
  memory.project = null;
  memory.conversation = null;
  memory.messages = [];
  memory.attachments = [];
  memory.references = [];
  memory.profile = null;
  memory.styleAnchor = null;
  memory.scripts = [];
  memory.jobs = [];
  memory.versions = [];
  memory.events = [];
  memory.exports = [];
  memory.forceQuota = false;
  memory.forceQualityFail = false;
  memory.cutoutCalls = 0;
  memory.nextId = 1;
  const png = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from("<svg width=\"256\" height=\"256\"><circle cx=\"128\" cy=\"128\" r=\"86\" fill=\"#1caee0\"/></svg>") }]).png().toBuffer();
  memory.imageDataUrl = `data:image/png;base64,${png.toString("base64")}`;
  const opaque = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 28, g: 170, b: 224, alpha: 1 } } }).png().toBuffer();
  memory.opaqueImageDataUrl = `data:image/png;base64,${opaque.toString("base64")}`;
});

describe("對話工作室真實 server route 整合", () => {
  it("提供不含憑證的 Provider health 摘要，讓工作室可解釋目前可用與未設定的模型", async () => {
    const health = await caller().studio.providerHealth();
    expect(health["gemini-3.1-flash-image"]).toMatchObject({ status: "healthy", configured: true });
    expect(health["gpt-image-2"]).toMatchObject({ status: "healthy", configured: true });
    expect(health["flux-2"]).toMatchObject({ status: "disabled", configured: false });
    expect(JSON.stringify(health)).not.toMatch(/api[_-]?key|bearer|secret/i);
  });

  it("保存附件與對話、建立八張獨立任務、完成生成與指定修改，並輸出單張 PNG 與 LINE ZIP", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我把這隻橘貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。", attachments: [{ dataUrl: memory.imageDataUrl, fileName: "cat.png", mimeType: "image/png" }] });
    expect(created.projectKey).toBeTruthy();
    expect(memory.messages.filter((item) => item.role === "user")).toHaveLength(1);
    expect(memory.messages.filter((item) => item.role === "assistant")).toHaveLength(1);
    expect(memory.attachments).toHaveLength(1);
    expect(memory.references).toHaveLength(1);
    expect(memory.scripts).toHaveLength(8);
    expect(memory.jobs.filter((item) => item.kind === "generate")).toHaveLength(8);
    expect(JSON.parse(memory.profile.profileJson)).toMatchObject({ referenceUrls: ["/manus-storage/test.png"], version: 1 });

    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    expect(memory.scripts.every((item) => item.status === "ready" && item.resultUrl)).toBe(true);
    expect(memory.jobs.filter((item) => item.kind === "generate").every((item) => item.status === "completed")).toBe(true);
    expect(JSON.parse(memory.jobs.find((item) => item.kind === "generate").checkpointJson)).toMatchObject({ geminiInteractionId: "gemini-test-interaction", referenceUrls: ["/manus-storage/test.png"] });
    expect(JSON.parse(memory.scripts[0].qualityReport)).toMatchObject({ verdict: "pass", outputReady: true, semanticReview: "not_available" });

    const edited = await api.studio.editSticker({ projectKey: created.projectKey, position: 3, instruction: "第 3 張眼睛大一點，表情更開心。" });
    expect(edited.status).toBe("completed");
    expect(memory.versions.filter((item) => item.scriptId === memory.scripts[2].id)).toHaveLength(2);

    const single = await api.studio.exportLineSingle({ projectKey: created.projectKey, position: 3 });
    expect(single.report.valid).toBe(true);
    expect(single.report.dimensions).toBe("370×320");

    const pack = await api.studio.exportLinePack({ projectKey: created.projectKey });
    expect(pack.reports).toHaveLength(8);
    expect(pack.reports.every((report) => report.valid)).toBe(true);
    expect(memory.exports.map((item) => item.kind)).toEqual(["line_single", "line_pack"]);
  });

  it("在所有圖像提供者額度耗盡時保存 paused_quota，並於繼續製作後只續跑未完成貼圖", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛的橘貓 LINE 貼圖", attachments: [] });
    memory.forceQuota = true;
    const paused = await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 1, position: 1 });
    expect(paused.completed).toMatchObject([{ status: "paused_quota" }]);
    const firstJob = memory.jobs.find((item) => item.scriptId === memory.scripts[0].id);
    expect(firstJob.status).toBe("paused_quota");
    expect(JSON.parse(firstJob.checkpointJson)).toMatchObject({ stage: "paused_quota", position: 1, resumeCommand: "繼續製作" });
    expect(memory.scripts[0].status).toBe("queued");
    expect(memory.scripts.slice(1).every((item) => item.resultUrl === null)).toBe(true);

    memory.forceQuota = false;
    await api.studio.sendMessage({ projectKey: created.projectKey, content: "繼續製作", attachments: [] });
    const resumed = await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 1, position: 1 });
    expect(resumed.completed).toMatchObject([{ status: "completed" }]);
    expect(memory.scripts[0].status).toBe("ready");
    expect(memory.scripts[0].resultUrl).toBeTruthy();
    expect(memory.scripts.slice(1).every((item) => item.resultUrl === null)).toBe(true);
  });

  it("在品質檢查發現透明背景失敗時自動修正一次、重新檢查並保存品質 checkpoint", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    memory.forceQualityFail = true;
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 1, position: 1 });
    const job = memory.jobs.find((item) => item.scriptId === memory.scripts[0].id);
    expect(memory.cutoutCalls).toBe(2);
    expect(JSON.parse(job.checkpointJson)).toMatchObject({ qualityAttempt: 1, stage: "completed" });
    expect(JSON.parse(memory.scripts[0].qualityReport)).toMatchObject({ verdict: "pass", outputReady: true });
    expect(memory.events.filter((event) => event.kind === "quality_fix").map((event) => event.status)).toEqual(["working", "completed"]);
  });

  it("整套自然語言修改會為每張已完成貼圖建立獨立 edit job，並僅執行本輪需要更新的工作", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    const queued = await api.studio.editPack({ projectKey: created.projectKey, instruction: "全部變可愛一點" });
    expect(queued.scheduled).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(memory.jobs.filter((job) => job.kind === "edit" && job.status === "queued")).toHaveLength(8);
    const edited = await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 2 });
    expect(edited.completed.filter((item) => item.status === "completed")).toHaveLength(2);
    expect(memory.versions.filter((version) => version.version === 2)).toHaveLength(2);
    expect(memory.jobs.filter((job) => job.kind === "edit" && job.status === "queued")).toHaveLength(6);
  });

  it("從聊天輸入全部變可愛會產生 edit_pack、排程每張獨立版本並由 runPending 自動續跑", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    const response = await api.studio.sendMessage({ projectKey: created.projectKey, content: "全部變可愛一點", attachments: [] });
    expect(response).toMatchObject({ intent: "edit_pack", autoRun: true });
    expect(memory.jobs.filter((job) => job.kind === "edit" && job.status === "queued")).toHaveLength(8);
    const ran = await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 1 });
    expect(ran.completed).toMatchObject([{ status: "completed" }]);
    expect(memory.versions.filter((version) => version.version === 2)).toHaveLength(1);
  });

  it("從聊天輸入全部去背會只排程透明檢查未通過的貼圖，並保存 pack scope checkpoint", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    memory.scripts[1].qualityReport = JSON.stringify({ alphaVerified: false, transparentCoverage: 0 });
    const response = await api.studio.sendMessage({ projectKey: created.projectKey, content: "全部去背，背景改透明", attachments: [] });
    expect(response).toMatchObject({ intent: "edit_pack", autoRun: true });
    expect(response.reply).toMatch(/1 張/);
    const jobs = memory.jobs.filter((job) => job.kind === "edit");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ scriptId: memory.scripts[1].id, status: "queued" });
    expect(JSON.parse(jobs[0].checkpointJson)).toMatchObject({ scope: "pack", position: 2 });
    expect(memory.jobs.some((job) => job.kind === "edit" && job.scriptId === memory.scripts[0].id)).toBe(false);
    const ran = await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 1 });
    expect(ran.completed).toMatchObject([{ status: "completed" }]);
  });

  it("全部去背只排程未通過透明檢查的貼圖，已符合條件的圖片不會建立重複 edit job", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    memory.scripts[1].qualityReport = JSON.stringify({ alphaVerified: false, transparentCoverage: 0 });
    const queued = await api.studio.editPack({ projectKey: created.projectKey, instruction: "全部去背，背景改透明" });
    expect(queued.scheduled).toEqual([2]);
    expect(queued.skipped).toContain(1);
    expect(memory.jobs.filter((job) => job.kind === "edit")).toHaveLength(1);
  });

  it("整套修改遇到 paused 生成任務時保留其狀態，只排程不衝突的已完成貼圖", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    Object.assign(memory.scripts[0], { status: "ready", resultUrl: "/manus-storage/test.png" });
    Object.assign(memory.jobs[0], { status: "paused_quota", checkpointJson: JSON.stringify({ stage: "paused_quota" }) });
    Object.assign(memory.scripts[1], { status: "ready", resultUrl: "/manus-storage/test.png" });
    Object.assign(memory.jobs[1], { status: "completed" });
    const queued = await api.studio.editPack({ projectKey: created.projectKey, instruction: "全部變可愛一點" });
    expect(queued.scheduled).toEqual([2]);
    expect(queued.skipped).toContain(1);
    expect(memory.jobs[0]).toMatchObject({ kind: "generate", status: "paused_quota" });
    expect(memory.jobs.filter((job) => job.kind === "edit")).toHaveLength(1);
  });

  it("整套修改與 queued／retrying 生成任務並存時不會重排它們，只修改沒有衝突的完成貼圖", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我做 8 張可愛兔子貼圖", attachments: [] });
    Object.assign(memory.scripts[0], { status: "ready", resultUrl: "/manus-storage/test.png" });
    Object.assign(memory.jobs[0], { status: "queued" });
    Object.assign(memory.scripts[1], { status: "ready", resultUrl: "/manus-storage/test.png" });
    Object.assign(memory.jobs[1], { status: "retrying" });
    Object.assign(memory.scripts[2], { status: "ready", resultUrl: "/manus-storage/test.png" });
    Object.assign(memory.jobs[2], { status: "completed" });
    const queued = await api.studio.editPack({ projectKey: created.projectKey, instruction: "全部變可愛一點" });
    expect(queued.scheduled).toEqual([3]);
    expect(queued.skipped).toEqual(expect.arrayContaining([1, 2]));
    expect(memory.jobs[0]).toMatchObject({ kind: "generate", status: "queued" });
    expect(memory.jobs[1]).toMatchObject({ kind: "generate", status: "retrying" });
    expect(memory.jobs.filter((job) => job.kind === "edit")).toHaveLength(1);
  });

  it("保留角色錨點，且會續跑額度中斷的指定修改而不建立重複修改工作", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我把這隻橘貓做成 8 張 LINE 貼圖", attachments: [{ dataUrl: memory.imageDataUrl, fileName: "cat.png", mimeType: "image/png" }] });
    const firstAnchor = memory.profile.profileJson;
    await api.studio.sendMessage({ projectKey: created.projectKey, content: "讓第 3 張的表情更可愛", attachments: [] });
    expect(memory.profile.profileJson).toBe(firstAnchor);

    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    memory.forceQuota = true;
    const paused = await api.studio.editSticker({ projectKey: created.projectKey, position: 3, instruction: "第 3 張眼睛大一點" });
    expect(paused.status).toBe("paused_quota");
    const editJob = memory.jobs.find((item) => item.kind === "edit");
    expect(JSON.parse(editJob.checkpointJson)).toMatchObject({ position: 3, instruction: "第 3 張眼睛大一點", stage: "paused_quota", resumeCommand: "繼續製作" });

    memory.forceQuota = false;
    const resumed = await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 1, position: 3 });
    expect(resumed.completed).toMatchObject([{ status: "completed" }]);
    expect(memory.jobs.filter((item) => item.kind === "edit")).toHaveLength(1);
    expect(editJob.status).toBe("completed");
  });

  it("可保存參考圖角色設定並在回復版本時切換 active version 與目前貼圖成果", async () => {
    const api = caller();
    const created = await api.studio.sendMessage({ content: "幫我把這隻橘貓做成 8 張 LINE 貼圖", attachments: [{ dataUrl: memory.imageDataUrl, fileName: "cat.png", mimeType: "image/png" }] });
    const reference = memory.references[0];
    await api.studio.setReferenceRole({ projectKey: created.projectKey, referenceId: reference.id, role: "accepted_character", accepted: true });
    expect(reference).toMatchObject({ role: "accepted_character", priority: 10, accepted: true });
    await api.studio.setReferenceRole({ projectKey: created.projectKey, referenceId: reference.id, role: "scene", accepted: false });
    expect(reference).toMatchObject({ role: "scene", priority: 65, accepted: false });

    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    await api.studio.runPending({ projectKey: created.projectKey, maxJobs: 4 });
    const script = memory.scripts.find((item) => item.position === 1);
    const initial = memory.versions.find((item) => item.scriptId === script.id && item.version === 1);
    expect(initial).toMatchObject({ isActive: true });

    await api.studio.editSticker({ projectKey: created.projectKey, position: 1, instruction: "第 1 張眼睛大一點" });
    const refined = memory.versions.find((item) => item.scriptId === script.id && item.version === 2);
    expect(refined).toMatchObject({ isActive: true, parentVersionId: initial.id });
    expect(initial.isActive).toBe(false);

    const restored = await api.studio.restoreVersion({ projectKey: created.projectKey, position: 1, versionId: initial.id });
    expect(restored).toMatchObject({ status: "completed", version: 1, url: initial.url });
    expect(script.resultUrl).toBe(initial.url);
    expect(initial.isActive).toBe(true);
    expect(refined.isActive).toBe(false);
  });
});
