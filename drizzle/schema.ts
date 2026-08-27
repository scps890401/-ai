import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { AttachmentMeta, ToolCallMeta } from "@shared/chat";

/** Core user table backing the optional Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Browser-scoped conversation identity for Phase 2 public Chat-first access. */
export const threads = mysqlTable("threads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: varchar("clientId", { length: 36 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("threads_client_id_idx").on(table.clientId),
]);

/** Persistent context rows. Attachment and tool data are metadata only; no raw file bytes are stored. */
export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  threadId: varchar("threadId", { length: 36 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "tool"]).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments").$type<AttachmentMeta[]>().notNull(),
  toolCalls: json("toolCalls").$type<ToolCallMeta[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("messages_thread_created_idx").on(table.threadId, table.createdAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type Message = typeof messages.$inferSelect;
