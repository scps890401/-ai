import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const learnedStickerIdeas = mysqlTable("learned_sticker_ideas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceMode: mysqlEnum("sourceMode", ["agent", "manual"]).notNull(),
  text: varchar("text", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  creative: text("creative"),
  normalizedKey: varchar("normalizedKey", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdeaUnique: uniqueIndex("learned_sticker_ideas_user_idea_unique").on(table.userId, table.normalizedKey),
}));

export type LearnedStickerIdea = typeof learnedStickerIdeas.$inferSelect;
export type InsertLearnedStickerIdea = typeof learnedStickerIdeas.$inferInsert;

export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  category: mysqlEnum("category", ["suggestion", "bug", "feature", "other"]).notNull(),
  message: text("message").notNull(),
  contact: varchar("contact", { length: 320 }),
  page: varchar("page", { length: 255 }),
  status: mysqlEnum("status", ["new", "reviewing", "resolved"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;