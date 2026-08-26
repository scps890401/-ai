import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { characterProfiles, projectAssets, projectCheckpoints, projectConversations, projectExports, projectMessages, stickerJobVersions, stickerJobs, stickerPlanItems, stickerPlans, stickerProjects, type StickerProject } from "../drizzle/schema";
import { storageCreatePresignedPut, storagePut } from "./storage";

export type ProjectActor = { userId?: number; guestKey?: string };

export const STICKER_JOB_STATUSES = ["pending", "generating", "completed", "failed", "retrying"] as const;
export type StickerJobStatus = (typeof STICKER_JOB_STATUSES)[number];

export function resolveStickerJobStatus(args: { requestedStatus?: string; hasGeneratedAsset: boolean; existingStatus?: string }): StickerJobStatus {
  const requested = STICKER_JOB_STATUSES.includes(args.requestedStatus as StickerJobStatus)
    ? args.requestedStatus as StickerJobStatus
    : args.hasGeneratedAsset ? "completed" : "pending";
  return args.existingStatus === "completed" && requested !== "completed" ? "completed" : requested;
}

export function shouldCreateStickerJobVersion(existingAssetId: number | null | undefined, nextAssetId: number | null | undefined) {
  return nextAssetId !== null && nextAssetId !== undefined && nextAssetId !== existingAssetId;
}

export function shouldRestoreStickerJobVersion(currentAssetId: number | null | undefined, versionAssetId: number) {
  return Number.isInteger(versionAssetId) && versionAssetId > 0 && currentAssetId !== versionAssetId;
}

export function isProjectExportStorageKey(projectId: number, storageKey: string) {
  return storageKey.startsWith(`sticker-muse/projects/${projectId}/exports/`);
}

export function parseProjectState(stateJson: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(stateJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function getProjectForActor(projectId: number, actor: ProjectActor): Promise<StickerProject | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const project = await db.select().from(stickerProjects).where(eq(stickerProjects.id, projectId)).limit(1);
  const row = project[0];
  if (!row) return undefined;

  const ownsByUser = actor.userId !== undefined && row.ownerUserId === actor.userId;
  const ownsByGuest = Boolean(actor.guestKey) && row.guestKey === actor.guestKey;
  return ownsByUser || ownsByGuest ? row : undefined;
}

export async function listProjectsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stickerProjects)
    .where(eq(stickerProjects.ownerUserId, userId))
    .orderBy(desc(stickerProjects.updatedAt));
}

export async function listProjectCheckpoints(projectId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectCheckpoints)
    .where(eq(projectCheckpoints.projectId, projectId))
    .orderBy(desc(projectCheckpoints.createdAt))
    .limit(limit);
}

export async function createProject(args: {
  name: string;
  packSize: number;
  stateJson: string;
  actor: ProjectActor;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(stickerProjects).values({
    name: args.name,
    packSize: args.packSize,
    stateJson: args.stateJson,
    ownerUserId: args.actor.userId ?? null,
    guestKey: args.actor.userId === undefined ? args.actor.guestKey ?? null : null,
  });
  return Number(result[0].insertId);
}

export async function saveProjectSnapshot(args: {
  project: StickerProject;
  stateJson: string;
  packSize: number;
  status: "draft" | "generating" | "paused" | "completed";
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  await db.update(stickerProjects).set({
    stateJson: args.stateJson,
    packSize: args.packSize,
    status: args.status,
    updatedAt: now,
    lastOpenedAt: now,
  }).where(eq(stickerProjects.id, args.project.id));
  await syncStructuredState(args.project.id, args.stateJson, args.packSize);
  await db.insert(projectCheckpoints).values({
    projectId: args.project.id,
    reason: args.reason,
    snapshotJson: args.stateJson,
  });
  return now;
}

async function syncStructuredState(projectId: number, stateJson: string, packSize: number) {
  const db = await getDb();
  if (!db) return;
  const state = parseProjectState(stateJson) as {
    prompt?: string;
    uploaded?: unknown[];
    sourceAssetIds?: unknown[];
    generated?: Array<{ label?: string; action?: string; src?: string; assetId?: number }>;
    chatMessages?: Array<{ role?: string; content?: string }>;
    imagePrompts?: unknown[];
    jobStates?: Array<{ position?: number; status?: string; errorMessage?: string }>;
  };
  const [existingConversation] = await db.select().from(projectConversations).where(eq(projectConversations.projectId, projectId)).limit(1);
  let conversation = existingConversation;
  if (!conversation) {
    const result = await db.insert(projectConversations).values({ projectId, title: state.prompt?.slice(0, 160) || "Sticker Muse 創作對話" });
    [conversation] = await db.select().from(projectConversations).where(eq(projectConversations.id, Number(result[0].insertId))).limit(1);
  }
  if (conversation) {
    await db.delete(projectMessages).where(eq(projectMessages.conversationId, conversation.id));
    const messages = (state.chatMessages ?? []).filter((message) => typeof message.content === "string" && message.content.trim()).map((message) => ({
      conversationId: conversation.id,
      role: (message.role === "assistant" || message.role === "system" ? message.role : "user") as "user" | "assistant" | "system",
      content: message.content!.slice(0, 6000),
    }));
    if (messages.length) await db.insert(projectMessages).values(messages);
  }

  const [latestProfile] = await db.select().from(characterProfiles).where(eq(characterProfiles.projectId, projectId)).orderBy(desc(characterProfiles.version)).limit(1);
  const visualBible = {
    source: "workspace-draft",
    referenceCount: state.uploaded?.length ?? 0,
    referenceAssetIds: state.sourceAssetIds ?? [],
    identityPrompt: state.prompt ?? "",
    preserve: ["物種與身份", "臉部／五官或毛色標記", "身體比例", "服裝與配件", "主色與輪廓", "貼圖畫風"],
    negative: ["不要改變角色身份", "不要增加角色肢體", "不要讓角色變成 generic mascot"],
  };
  if (!latestProfile) {
    await db.insert(characterProfiles).values({ projectId, name: "主要角色", visualBibleJson: JSON.stringify(visualBible), referenceAssetIdsJson: JSON.stringify(state.sourceAssetIds ?? []) });
  } else {
    await db.update(characterProfiles).set({ visualBibleJson: JSON.stringify(visualBible), referenceAssetIdsJson: JSON.stringify(state.sourceAssetIds ?? []), updatedAt: new Date() }).where(eq(characterProfiles.id, latestProfile.id));
  }

  const [latestPlan] = await db.select().from(stickerPlans).where(eq(stickerPlans.projectId, projectId)).orderBy(desc(stickerPlans.version)).limit(1);
  let plan = latestPlan;
  if (!plan) {
    const result = await db.insert(stickerPlans).values({ projectId, brief: state.prompt || "LINE 貼圖創作", language: "zh-Hant", style: "保持角色一致的可愛貼圖風格" });
    [plan] = await db.select().from(stickerPlans).where(eq(stickerPlans.id, Number(result[0].insertId))).limit(1);
  }
  if (plan) {
    const [existingItem] = await db.select().from(stickerPlanItems).where(eq(stickerPlanItems.planId, plan.id)).limit(1);
    if (!existingItem) {
      const items = Array.from({ length: packSize }, (_, index) => {
        const generated = state.generated?.[index];
        return {
          planId: plan.id,
          position: index + 1,
          text: generated?.label?.split("／").at(-1)?.slice(0, 160) || `第 ${index + 1} 張貼圖`,
          action: generated?.action?.slice(0, 255) || "待 AI 規劃動作與情境",
          emotion: "待規劃",
          composition: "角色置中、保留清楚輪廓與透明背景",
          prompt: state.imagePrompts?.[index] ? String(state.imagePrompts[index]).slice(0, 6000) : state.prompt?.slice(0, 6000),
          targetStickerId: null,
        };
      });
      await db.insert(stickerPlanItems).values(items);
    }
  }

  for (let index = 0; index < packSize; index += 1) {
    const position = index + 1;
    const generated = state.generated?.[index];
    const savedJob = state.jobStates?.find((item) => item.position === position);
    const [job] = await db.select().from(stickerJobs).where(and(eq(stickerJobs.projectId, projectId), eq(stickerJobs.position, position))).limit(1);
    const status = resolveStickerJobStatus({ requestedStatus: savedJob?.status, hasGeneratedAsset: Boolean(generated), existingStatus: job?.status });
    const errorMessage = savedJob?.errorMessage?.slice(0, 6000) || null;
    const errorCode = errorMessage && /usage exhausted|failed_precondition|quota|rate limit|insufficient/i.test(errorMessage) ? "quota" : errorMessage ? "generation_failed" : null;
    let jobId: number;
    if (job) {
      jobId = job.id;
      await db.update(stickerJobs).set({ status, errorCode, errorMessage, attemptCount: Math.max(job.attemptCount, status === "generating" || status === "retrying" || status === "completed" || status === "failed" ? 1 : 0), currentAssetId: generated?.assetId ?? job.currentAssetId, completedAt: status === "completed" ? job.completedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(stickerJobs.id, job.id));
    } else {
      const inserted = await db.insert(stickerJobs).values({ projectId, position, status, attemptCount: status === "pending" ? 0 : 1, currentAssetId: generated?.assetId ?? null, errorCode, errorMessage, completedAt: status === "completed" ? new Date() : null });
      jobId = Number(inserted[0].insertId);
    }
    const generatedAssetId = generated?.assetId;
    const persistedJobId = jobId;
    if (persistedJobId !== undefined && shouldCreateStickerJobVersion(job?.currentAssetId, generatedAssetId) && generatedAssetId !== undefined) {
      const [latestVersion] = await db.select().from(stickerJobVersions).where(eq(stickerJobVersions.jobId, persistedJobId)).orderBy(desc(stickerJobVersions.version)).limit(1);
      await db.insert(stickerJobVersions).values({ jobId: persistedJobId, version: (latestVersion?.version ?? 0) + 1, assetId: generatedAssetId, editPrompt: state.prompt ?? null, changeSummary: generated?.label ?? null });
    }
  }
}

export async function createProjectAsset(args: {
  projectId: number;
  kind: "source" | "reference" | "generated" | "export";
  position?: number;
  fileName: string;
  mimeType: string;
  data: Buffer;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const safeName = args.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "asset";
  const stored = await storagePut(`sticker-muse/projects/${args.projectId}/${Date.now()}-${safeName}`, args.data, args.mimeType);
  const result = await db.insert(projectAssets).values({
    projectId: args.projectId,
    kind: args.kind,
    position: args.position,
    storageKey: stored.key,
    mimeType: args.mimeType,
    fileSize: args.data.byteLength,
  });
  return { id: Number(result[0].insertId), key: stored.key, url: stored.url };
}

export async function listProjectJobs(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stickerJobs).where(eq(stickerJobs.projectId, projectId)).orderBy(stickerJobs.position);
}

export async function listProjectJobVersions(projectId: number, position: number) {
  const db = await getDb();
  if (!db) return [];
  const [job] = await db.select().from(stickerJobs).where(and(eq(stickerJobs.projectId, projectId), eq(stickerJobs.position, position))).limit(1);
  if (!job) return [];
  const versions = await db.select().from(stickerJobVersions).where(eq(stickerJobVersions.jobId, job.id)).orderBy(desc(stickerJobVersions.version));
  return Promise.all(versions.map(async (version) => {
    const [asset] = await db.select().from(projectAssets).where(and(eq(projectAssets.id, version.assetId), eq(projectAssets.projectId, projectId))).limit(1);
    return {
      id: version.id,
      version: version.version,
      assetId: version.assetId,
      editPrompt: version.editPrompt,
      changeSummary: version.changeSummary,
      createdAt: version.createdAt,
      url: asset ? `/manus-storage/${asset.storageKey}` : null,
      isCurrent: job.currentAssetId === version.assetId,
    };
  }));
}

export async function restoreProjectJobVersion(args: { projectId: number; position: number; versionId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [job] = await db.select().from(stickerJobs).where(and(eq(stickerJobs.projectId, args.projectId), eq(stickerJobs.position, args.position))).limit(1);
  if (!job) throw new Error("找不到這張貼圖的工作紀錄。");
  const [version] = await db.select().from(stickerJobVersions).where(and(eq(stickerJobVersions.id, args.versionId), eq(stickerJobVersions.jobId, job.id))).limit(1);
  if (!version) throw new Error("找不到指定的貼圖版本。");
  const [asset] = await db.select().from(projectAssets).where(and(eq(projectAssets.id, version.assetId), eq(projectAssets.projectId, args.projectId))).limit(1);
  if (!asset) throw new Error("指定版本的圖片素材無法使用。");
  if (shouldRestoreStickerJobVersion(job.currentAssetId, version.assetId)) {
    await db.update(stickerJobs).set({ currentAssetId: version.assetId, status: "completed", errorCode: null, errorMessage: null, completedAt: new Date(), updatedAt: new Date() }).where(eq(stickerJobs.id, job.id));
  }
  return { position: args.position, assetId: version.assetId, url: `/manus-storage/${asset.storageKey}`, version: version.version, changeSummary: version.changeSummary };
}

export async function touchProject(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(stickerProjects).set({ lastOpenedAt: new Date() }).where(eq(stickerProjects.id, projectId));
}

export async function prepareProjectExportUpload(args: {
  projectId: number;
  type: "png" | "zip";
  fileName: string;
}) {
  const safeName = args.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || `line-export.${args.type}`;
  return storageCreatePresignedPut(`sticker-muse/projects/${args.projectId}/exports/${Date.now()}-${safeName}`);
}

export async function registerProjectExport(args: {
  projectId: number;
  type: "png" | "zip";
  storageKey: string;
  validationJson: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!isProjectExportStorageKey(args.projectId, args.storageKey)) throw new Error("Export storage key is invalid");
  const result = await db.insert(projectExports).values({
    projectId: args.projectId,
    type: args.type,
    storageKey: args.storageKey,
    status: "ready",
    validationJson: args.validationJson,
  });
  return { id: Number(result[0].insertId), storageKey: args.storageKey, url: `/manus-storage/${args.storageKey}` };
}

export async function listProjectExports(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectExports).where(eq(projectExports.projectId, projectId)).orderBy(desc(projectExports.createdAt));
}
