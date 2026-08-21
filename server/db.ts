import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  InsertStickerProject,
  InsertUser,
  stickerProjects,
  stickerReferences,
  stickerScripts,
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

export async function addStickerReference(input: { projectId: number; url: string; fileName: string; sortOrder: number }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerReferences).values(input);
  const result = await db.select().from(stickerReferences).where(and(eq(stickerReferences.projectId, input.projectId), eq(stickerReferences.fileName, input.fileName))).orderBy(asc(stickerReferences.sortOrder)).limit(1);
  return result[0];
}

export async function addStickerScript(input: { projectId: number; position: number; emotion: string; phrase: string; scene?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerScripts).values({ ...input, scene: input.scene ?? null });
  const result = await db.select().from(stickerScripts).where(and(eq(stickerScripts.projectId, input.projectId), eq(stickerScripts.position, input.position))).limit(1);
  return result[0];
}

export async function updateStickerScript(input: { id: number; status?: "draft" | "queued" | "generating" | "ready" | "error"; resultUrl?: string | null; errorMessage?: string | null; qualityReport?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  const { id, ...updates } = input;
  await db.update(stickerScripts).set(updates).where(eq(stickerScripts.id, id));
  const result = await db.select().from(stickerScripts).where(eq(stickerScripts.id, id)).limit(1);
  return result[0];
}

export async function addStickerVersion(input: { scriptId: number; version: number; url: string; mode: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerVersions).values(input);
  const result = await db.select().from(stickerVersions).where(and(eq(stickerVersions.scriptId, input.scriptId), eq(stickerVersions.version, input.version))).limit(1);
  return result[0];
}
