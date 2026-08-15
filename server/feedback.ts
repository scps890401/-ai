import { desc, eq } from "drizzle-orm";
import { feedback, type InsertFeedback } from "../drizzle/schema";
import { getDb } from "./db";

export type FeedbackCategory = "suggestion" | "bug" | "feature" | "other";
export type FeedbackStatus = "new" | "reviewing" | "resolved";

const feedbackRate = new Map<string, { count: number; resetAt: number }>();
const FEEDBACK_RATE_LIMIT = 5;
const FEEDBACK_RATE_WINDOW_MS = 10 * 60 * 1000;

export function consumeFeedbackRateLimit(key: string, now = Date.now()) {
  const current = feedbackRate.get(key);
  if (!current || current.resetAt <= now) {
    feedbackRate.set(key, { count: 1, resetAt: now + FEEDBACK_RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= FEEDBACK_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

export function normalizeFeedbackMessage(message: string) {
  return message.trim().replace(/\s{3,}/g, "  ");
}

export type CreateFeedbackInput = {
  category: FeedbackCategory;
  message: string;
  contact?: string;
  page?: string;
  userId?: number;
};

export async function createFeedback(input: CreateFeedbackInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertFeedback = {
    category: input.category,
    message: normalizeFeedbackMessage(input.message),
    contact: input.contact?.trim() || null,
    page: input.page?.trim() || null,
    userId: input.userId ?? null,
  };
  const result = await db.insert(feedback).values(values);
  const insertedId = Number(result[0].insertId);
  const rows = await db.select().from(feedback).where(eq(feedback.id, insertedId)).limit(1);
  return rows[0];
}

export async function listFeedback() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedback).orderBy(desc(feedback.createdAt));
}

export async function updateFeedbackStatus(id: number, status: FeedbackStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
  const rows = await db.select().from(feedback).where(eq(feedback.id, id)).limit(1);
  return rows[0];
}
