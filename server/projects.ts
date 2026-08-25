import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { projectAssets, projectCheckpoints, stickerProjects, type StickerProject } from "../drizzle/schema";
import { storagePut } from "./storage";

export type ProjectActor = { userId?: number; guestKey?: string };

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
  await db.insert(projectCheckpoints).values({
    projectId: args.project.id,
    reason: args.reason,
    snapshotJson: args.stateJson,
  });
  return now;
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

export async function touchProject(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(stickerProjects).set({ lastOpenedAt: new Date() }).where(eq(stickerProjects.id, projectId));
}
