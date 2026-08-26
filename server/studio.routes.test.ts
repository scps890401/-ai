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
  forceQuota: false,
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
  addStickerAgentEvent: vi.fn(async (input: any) => ({ id: memory.nextId++, ...input, createdAt: new Date() })),
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

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ intent: "generate_pending", reply: "已建立 8 張貼圖規劃。", projectTitle: "橘貓日常", stickerCount: 8, characterProfile: "橘色短毛貓，圓眼睛，深藍圍裙；所有貼圖維持相同毛色、圍裙與比例。", scripts: Array.from({ length: 8 }, (_, index) => ({ position: index + 1, emotion: "日常", phrase: `文字${index + 1}`, scene: "可愛日常姿勢" })), targetPosition: 0, editInstruction: "" }) } }] })) }));

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
  memory.nextId = 1;
  const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 28, g: 170, b: 224, alpha: 1 } } }).png().toBuffer();
  memory.imageDataUrl = `data:image/png;base64,${png.toString("base64")}`;
});

describe("對話工作室真實 server route 整合", () => {
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
