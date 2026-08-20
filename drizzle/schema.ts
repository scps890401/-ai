import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const stickerProjects = mysqlTable("stickerProjects", {
  id: int("id").autoincrement().primaryKey(),
  projectKey: varchar("projectKey", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  brief: text("brief"),
  characterProfile: text("characterProfile"),
  style: varchar("style", { length: 80 }).notNull(),
  stickerCount: int("stickerCount").notNull().default(10),
  status: mysqlEnum("status", ["draft", "generating", "ready", "error"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerReferences = mysqlTable("stickerReferences", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  url: text("url").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerScripts = mysqlTable("stickerScripts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  position: int("position").notNull(),
  emotion: varchar("emotion", { length: 80 }).notNull(),
  phrase: varchar("phrase", { length: 160 }).notNull(),
  scene: text("scene"),
  status: mysqlEnum("status", ["draft", "queued", "generating", "ready", "error"]).notNull().default("draft"),
  resultUrl: text("resultUrl"),
  errorMessage: text("errorMessage"),
  qualityReport: text("qualityReport"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerVersions = mysqlTable("stickerVersions", {
  id: int("id").autoincrement().primaryKey(),
  scriptId: int("scriptId").notNull(),
  version: int("version").notNull().default(1),
  url: text("url").notNull(),
  mode: varchar("mode", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StickerProject = typeof stickerProjects.$inferSelect;
export type InsertStickerProject = typeof stickerProjects.$inferInsert;
export type StickerReference = typeof stickerReferences.$inferSelect;
export type StickerScript = typeof stickerScripts.$inferSelect;
export type StickerVersion = typeof stickerVersions.$inferSelect;
