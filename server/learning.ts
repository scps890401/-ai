import { and, desc, eq } from "drizzle-orm";
import { learnedStickerIdeas } from "../drizzle/schema";
import { getDb } from "./db";

export type LearnedIdeaInput = {
  userId: number;
  sourceMode: "agent" | "manual";
  text: string;
  action: string;
  creative?: string;
};

export type StoredLearnedIdea = {
  id: number;
  userId?: number;
  sourceMode: "agent" | "manual";
  text: string;
  action: string;
  creative: string | null;
  normalizedKey?: string;
  createdAt?: Date;
};

export type LearningPersistence = {
  hasDuplicate: (userId: number, normalizedKey: string) => Promise<boolean>;
  insert: (input: LearnedIdeaInput, normalizedKey: string, text: string, action: string, creative: string | null) => Promise<void>;
  list: (userId: number) => Promise<StoredLearnedIdea[]>;
  clear: (userId: number) => Promise<number>;
};

export function normalizeLearnedIdea(text: string, action: string, creative = "") {
  return [text, action, creative]
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean)
    .join("|")
    .slice(0, 255);
}

const mysqlPersistence: LearningPersistence = {
  async hasDuplicate(userId, normalizedKey) {
    const db = await getDb();
    if (!db) return false;
    const existing = await db.select({ id: learnedStickerIdeas.id })
      .from(learnedStickerIdeas)
      .where(and(eq(learnedStickerIdeas.userId, userId), eq(learnedStickerIdeas.normalizedKey, normalizedKey)))
      .limit(1);
    return existing.length > 0;
  },
  async insert(input, normalizedKey, text, action, creative) {
    const db = await getDb();
    if (!db) return;
    await db.insert(learnedStickerIdeas).values({ userId: input.userId, sourceMode: input.sourceMode, text, action, creative, normalizedKey });
  },
  async list(userId) {
    const db = await getDb();
    if (!db) return [];
    return db.select({ id: learnedStickerIdeas.id, userId: learnedStickerIdeas.userId, sourceMode: learnedStickerIdeas.sourceMode, text: learnedStickerIdeas.text, action: learnedStickerIdeas.action, creative: learnedStickerIdeas.creative, normalizedKey: learnedStickerIdeas.normalizedKey, createdAt: learnedStickerIdeas.createdAt })
      .from(learnedStickerIdeas).where(eq(learnedStickerIdeas.userId, userId)).orderBy(desc(learnedStickerIdeas.createdAt));
  },
  async clear(userId) {
    const db = await getDb();
    if (!db) return 0;
    const existing = await db.select({ id: learnedStickerIdeas.id }).from(learnedStickerIdeas).where(eq(learnedStickerIdeas.userId, userId));
    await db.delete(learnedStickerIdeas).where(eq(learnedStickerIdeas.userId, userId));
    return existing.length;
  },
};

export async function saveLearnedIdea(input: LearnedIdeaInput, persistence: LearningPersistence = mysqlPersistence) {
  const text = input.text.trim().slice(0, 255);
  const action = input.action.trim().slice(0, 255);
  const creative = input.creative?.trim().slice(0, 2000) || null;
  if (!text || !action) return { saved: false, duplicate: false };
  const normalizedKey = normalizeLearnedIdea(text, action, creative ?? "");
  if (await persistence.hasDuplicate(input.userId, normalizedKey)) return { saved: false, duplicate: true };
  await persistence.insert(input, normalizedKey, text, action, creative);
  return { saved: true, duplicate: false };
}

export async function listLearnedIdeas(userId: number, persistence: LearningPersistence = mysqlPersistence) {
  return persistence.list(userId);
}

export async function clearLearnedIdeas(userId: number, persistence: LearningPersistence = mysqlPersistence) {
  return { deleted: await persistence.clear(userId) };
}
