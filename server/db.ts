import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  InsertStickerProject,
  InsertUser,
  stickerProjects,
  stickerAttachments,
  stickerAgentEvents,
  stickerCharacterProfiles,
  stickerConversations,
  stickerExports,
  stickerJobs,
  stickerMessages,
  stickerReferences,
  stickerScripts,
  stickerStyleAnchors,
  stickerVersions,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createStickerProject(input: InsertStickerProject) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerProjects).values(input);
  const result = await db.select().from(stickerProjects).where(eq(stickerProjects.projectKey, input.projectKey)).limit(1);
  return result[0];
}

export async function getStickerProject(projectKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const project = (await db.select().from(stickerProjects).where(eq(stickerProjects.projectKey, projectKey)).limit(1))[0];
  if (!project) return undefined;
  const references = await db.select().from(stickerReferences).where(eq(stickerReferences.projectId, project.id)).orderBy(asc(stickerReferences.sortOrder));
  const scripts = await db.select().from(stickerScripts).where(eq(stickerScripts.projectId, project.id)).orderBy(asc(stickerScripts.position));
  return { project, references, scripts };
}

export async function addStickerReference(input: { projectId: number; url: string; fileName: string; sortOrder: number; role?: string; priority?: number; accepted?: boolean; metadataJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerReferences).values({ ...input, role: input.role ?? "character", priority: input.priority ?? 50, accepted: input.accepted ?? false, metadataJson: input.metadataJson ?? null });
  const result = await db.select().from(stickerReferences).where(and(eq(stickerReferences.projectId, input.projectId), eq(stickerReferences.fileName, input.fileName))).orderBy(asc(stickerReferences.sortOrder)).limit(1);
  return result[0];
}

export async function updateStickerReference(input: { id: number; role?: string; priority?: number; accepted?: boolean; metadataJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  const { id, ...updates } = input;
  await db.update(stickerReferences).set(updates).where(eq(stickerReferences.id, id));
  return (await db.select().from(stickerReferences).where(eq(stickerReferences.id, id)).limit(1))[0];
}

export async function addStickerScript(input: { projectId: number; position: number; emotion: string; phrase: string; scene?: string; planJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerScripts).values({ ...input, scene: input.scene ?? null, planJson: input.planJson ?? null });
  const result = await db.select().from(stickerScripts).where(and(eq(stickerScripts.projectId, input.projectId), eq(stickerScripts.position, input.position))).limit(1);
  return result[0];
}

export async function updateStickerScript(input: { id: number; status?: "draft" | "queued" | "generating" | "ready" | "error"; resultUrl?: string | null; errorMessage?: string | null; qualityReport?: string | null; planJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  const { id, ...updates } = input;
  await db.update(stickerScripts).set(updates).where(eq(stickerScripts.id, id));
  const result = await db.select().from(stickerScripts).where(eq(stickerScripts.id, id)).limit(1);
  return result[0];
}

export async function addStickerVersion(input: { scriptId: number; version: number; url: string; mode: string; parentVersionId?: number | null; isActive?: boolean; qualityReportJson?: string | null; provider?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  if (input.isActive ?? true) await db.update(stickerVersions).set({ isActive: false }).where(eq(stickerVersions.scriptId, input.scriptId));
  await db.insert(stickerVersions).values({ ...input, parentVersionId: input.parentVersionId ?? null, isActive: input.isActive ?? true, qualityReportJson: input.qualityReportJson ?? null, provider: input.provider ?? null });
  const result = await db.select().from(stickerVersions).where(and(eq(stickerVersions.scriptId, input.scriptId), eq(stickerVersions.version, input.version))).limit(1);
  return result[0];
}

export async function getStickerVersions(scriptId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stickerVersions).where(eq(stickerVersions.scriptId, scriptId)).orderBy(asc(stickerVersions.version), asc(stickerVersions.id));
}

export async function restoreStickerVersion(input: { scriptId: number; versionId: number }) {
  const db = await getDb();
  if (!db) return undefined;
  const version = (await db.select().from(stickerVersions).where(and(eq(stickerVersions.id, input.versionId), eq(stickerVersions.scriptId, input.scriptId))).limit(1))[0];
  if (!version) return undefined;
  await db.update(stickerVersions).set({ isActive: false }).where(eq(stickerVersions.scriptId, input.scriptId));
  await db.update(stickerVersions).set({ isActive: true }).where(eq(stickerVersions.id, version.id));
  await db.update(stickerScripts).set({ status: "ready", resultUrl: version.url, errorMessage: null }).where(eq(stickerScripts.id, input.scriptId));
  return version;
}

export async function updateStickerProject(input: { id: number; title?: string; brief?: string | null; characterProfile?: string | null; style?: string; stickerCount?: number; status?: "draft" | "generating" | "ready" | "error" }) {
  const db = await getDb();
  if (!db) return undefined;
  const { id, ...updates } = input;
  await db.update(stickerProjects).set(updates).where(eq(stickerProjects.id, id));
  return (await db.select().from(stickerProjects).where(eq(stickerProjects.id, id)).limit(1))[0];
}

export async function createStickerConversation(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerConversations).values({ projectId });
  return (await db.select().from(stickerConversations).where(eq(stickerConversations.projectId, projectId)).orderBy(desc(stickerConversations.id)).limit(1))[0];
}

export async function getLatestStickerConversation(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(stickerConversations).where(eq(stickerConversations.projectId, projectId)).orderBy(desc(stickerConversations.lastActiveAt)).limit(1))[0];
}

export async function addStickerMessage(input: { conversationId: number; role: "user" | "assistant" | "system"; content: string; intentJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerMessages).values({ ...input, intentJson: input.intentJson ?? null });
  return (await db.select().from(stickerMessages).where(eq(stickerMessages.conversationId, input.conversationId)).orderBy(desc(stickerMessages.id)).limit(1))[0];
}

export async function addStickerAttachments(input: Array<{ projectId: number; messageId: number; fileKey: string; url: string; fileName: string; mimeType: string; sortOrder: number }>) {
  const db = await getDb();
  if (!db || !input.length) return [];
  await db.insert(stickerAttachments).values(input);
  return db.select().from(stickerAttachments).where(inArray(stickerAttachments.messageId, Array.from(new Set(input.map((item) => item.messageId))))).orderBy(asc(stickerAttachments.sortOrder));
}

export async function saveStickerCharacterProfile(input: { projectId: number; profileJson: string; anchorUrl?: string | null; status?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerCharacterProfiles).values({ projectId: input.projectId, profileJson: input.profileJson, anchorUrl: input.anchorUrl ?? null, status: input.status ?? "ready" });
  return (await db.select().from(stickerCharacterProfiles).where(eq(stickerCharacterProfiles.projectId, input.projectId)).orderBy(desc(stickerCharacterProfiles.id)).limit(1))[0];
}

export async function saveStickerStyleAnchor(input: { projectId: number; summaryJson: string; anchorUrl?: string | null; status?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerStyleAnchors).values({ projectId: input.projectId, summaryJson: input.summaryJson, anchorUrl: input.anchorUrl ?? null, status: input.status ?? "ready" });
  return (await db.select().from(stickerStyleAnchors).where(eq(stickerStyleAnchors.projectId, input.projectId)).orderBy(desc(stickerStyleAnchors.id)).limit(1))[0];
}

export async function getLatestStickerStyleAnchor(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(stickerStyleAnchors).where(eq(stickerStyleAnchors.projectId, projectId)).orderBy(desc(stickerStyleAnchors.id)).limit(1))[0];
}

export async function createStickerJob(input: { projectId: number; scriptId?: number | null; kind: string; status?: string; attempt?: number; provider?: string | null; checkpointJson?: string | null; routerJson?: string | null; qualityReportJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerJobs).values({ projectId: input.projectId, scriptId: input.scriptId ?? null, kind: input.kind, status: input.status ?? "queued", attempt: input.attempt ?? 0, provider: input.provider ?? null, checkpointJson: input.checkpointJson ?? null, routerJson: input.routerJson ?? null, qualityReportJson: input.qualityReportJson ?? null });
  return (await db.select().from(stickerJobs).where(eq(stickerJobs.projectId, input.projectId)).orderBy(desc(stickerJobs.id)).limit(1))[0];
}

export async function updateStickerJob(input: { id: number; status?: string; attempt?: number; provider?: string | null; errorCode?: string | null; errorMessage?: string | null; checkpointJson?: string | null; routerJson?: string | null; qualityReportJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  const { id, ...updates } = input;
  await db.update(stickerJobs).set(updates).where(eq(stickerJobs.id, id));
  return (await db.select().from(stickerJobs).where(eq(stickerJobs.id, id)).limit(1))[0];
}

export async function addStickerAgentEvent(input: { projectId: number; jobId?: number | null; kind: string; status: string; message: string; detailJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerAgentEvents).values({ projectId: input.projectId, jobId: input.jobId ?? null, kind: input.kind, status: input.status, message: input.message, detailJson: input.detailJson ?? null });
  return (await db.select().from(stickerAgentEvents).where(eq(stickerAgentEvents.projectId, input.projectId)).orderBy(desc(stickerAgentEvents.id)).limit(1))[0];
}

export async function addStickerExport(input: { projectId: number; kind: string; url: string; qualityReportJson?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerExports).values({ ...input, qualityReportJson: input.qualityReportJson ?? null });
  return (await db.select().from(stickerExports).where(eq(stickerExports.projectId, input.projectId)).orderBy(desc(stickerExports.id)).limit(1))[0];
}

export async function getStickerStudio(projectKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const project = (await db.select().from(stickerProjects).where(eq(stickerProjects.projectKey, projectKey)).limit(1))[0];
  if (!project) return undefined;
  const conversation = (await db.select().from(stickerConversations).where(eq(stickerConversations.projectId, project.id)).orderBy(desc(stickerConversations.lastActiveAt)).limit(1))[0];
  const messages = conversation ? await db.select().from(stickerMessages).where(eq(stickerMessages.conversationId, conversation.id)).orderBy(asc(stickerMessages.createdAt), asc(stickerMessages.id)) : [];
  const attachments = await db.select().from(stickerAttachments).where(eq(stickerAttachments.projectId, project.id)).orderBy(asc(stickerAttachments.createdAt), asc(stickerAttachments.sortOrder));
  const characterProfile = (await db.select().from(stickerCharacterProfiles).where(eq(stickerCharacterProfiles.projectId, project.id)).orderBy(desc(stickerCharacterProfiles.id)).limit(1))[0];
  const styleAnchor = (await db.select().from(stickerStyleAnchors).where(eq(stickerStyleAnchors.projectId, project.id)).orderBy(desc(stickerStyleAnchors.id)).limit(1))[0];
  const references = await db.select().from(stickerReferences).where(eq(stickerReferences.projectId, project.id)).orderBy(asc(stickerReferences.priority), asc(stickerReferences.sortOrder));
  const scripts = await db.select().from(stickerScripts).where(eq(stickerScripts.projectId, project.id)).orderBy(asc(stickerScripts.position));
  const versions = scripts.length ? await db.select().from(stickerVersions).where(inArray(stickerVersions.scriptId, scripts.map((script) => script.id))).orderBy(asc(stickerVersions.scriptId), asc(stickerVersions.version), asc(stickerVersions.id)) : [];
  const jobs = await db.select().from(stickerJobs).where(eq(stickerJobs.projectId, project.id)).orderBy(asc(stickerJobs.createdAt), asc(stickerJobs.id));
  const events = await db.select().from(stickerAgentEvents).where(eq(stickerAgentEvents.projectId, project.id)).orderBy(desc(stickerAgentEvents.createdAt), desc(stickerAgentEvents.id)).limit(80);
  const exports = await db.select().from(stickerExports).where(eq(stickerExports.projectId, project.id)).orderBy(desc(stickerExports.createdAt));
  return { project, conversation, messages, attachments, characterProfile, styleAnchor, references, scripts, versions, jobs, events, exports };
}
