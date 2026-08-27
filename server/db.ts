import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { AttachmentMeta, ToolCallMeta } from "@shared/chat";
import { type InsertUser, messages, threads, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect", error);
      database = null;
    }
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { ...user, lastSignedIn: user.lastSignedIn ?? new Date() };
  if (!values.role && user.openId === ENV.ownerOpenId) values.role = "admin";
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createThread(input: { id: string; clientId: string; title: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(threads).values(input);
  const thread = await findThread(input.id, input.clientId);
  if (!thread) throw new Error("Thread creation failed.");
  return thread;
}

export async function findThread(threadId: string, clientId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.select().from(threads).where(and(eq(threads.id, threadId), eq(threads.clientId, clientId))).limit(1);
  return result[0] ?? null;
}

export async function getThreadMessages(threadId: string, limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const newestFirst = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(desc(messages.createdAt)).limit(limit);
  return [...newestFirst].reverse();
}

export async function insertMessage(input: {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  attachments: AttachmentMeta[];
  toolCalls: ToolCallMeta[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(messages).values(input);
  await db.update(threads).set({ updatedAt: new Date() }).where(eq(threads.id, input.threadId));
}

export async function getLatestThreadMessages(threadId: string, limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt)).limit(limit);
}
