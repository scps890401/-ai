import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  role: varchar("role", { length: 40 }).notNull().default("character"),
  priority: int("priority").notNull().default(50),
  accepted: boolean("accepted").notNull().default(false),
  metadataJson: text("metadataJson"),
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
  planJson: text("planJson"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerVersions = mysqlTable("stickerVersions", {
  id: int("id").autoincrement().primaryKey(),
  scriptId: int("scriptId").notNull(),
  version: int("version").notNull().default(1),
  url: text("url").notNull(),
  mode: varchar("mode", { length: 40 }).notNull(),
  parentVersionId: int("parentVersionId"),
  isActive: boolean("isActive").notNull().default(true),
  qualityReportJson: text("qualityReportJson"),
  provider: varchar("provider", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerConversations = mysqlTable("stickerConversations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  status: varchar("status", { length: 40 }).notNull().default("active"),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerMessages = mysqlTable("stickerMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  intentJson: text("intentJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerAttachments = mysqlTable("stickerAttachments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  messageId: int("messageId").notNull(),
  fileKey: text("fileKey").notNull(),
  url: text("url").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerCharacterProfiles = mysqlTable("stickerCharacterProfiles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  profileJson: text("profileJson").notNull(),
  anchorUrl: text("anchorUrl"),
  status: varchar("status", { length: 40 }).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerStyleAnchors = mysqlTable("stickerStyleAnchors", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  summaryJson: text("summaryJson").notNull(),
  anchorUrl: text("anchorUrl"),
  status: varchar("status", { length: 40 }).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerJobs = mysqlTable("stickerJobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  scriptId: int("scriptId"),
  kind: varchar("kind", { length: 64 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("queued"),
  attempt: int("attempt").notNull().default(0),
  provider: varchar("provider", { length: 64 }),
  errorCode: varchar("errorCode", { length: 120 }),
  errorMessage: text("errorMessage"),
  checkpointJson: text("checkpointJson"),
  routerJson: text("routerJson"),
  qualityReportJson: text("qualityReportJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerExports = mysqlTable("stickerExports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  url: text("url").notNull(),
  qualityReportJson: text("qualityReportJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerAgentEvents = mysqlTable("stickerAgentEvents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  jobId: int("jobId"),
  kind: varchar("kind", { length: 64 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("queued"),
  message: text("message").notNull(),
  detailJson: text("detailJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StickerProject = typeof stickerProjects.$inferSelect;
export type InsertStickerProject = typeof stickerProjects.$inferInsert;
export type StickerReference = typeof stickerReferences.$inferSelect;
export type StickerScript = typeof stickerScripts.$inferSelect;
export type StickerVersion = typeof stickerVersions.$inferSelect;
export type StickerConversation = typeof stickerConversations.$inferSelect;
export type StickerMessage = typeof stickerMessages.$inferSelect;
export type StickerAttachment = typeof stickerAttachments.$inferSelect;
export type StickerCharacterProfile = typeof stickerCharacterProfiles.$inferSelect;
export type StickerStyleAnchor = typeof stickerStyleAnchors.$inferSelect;
export type StickerJob = typeof stickerJobs.$inferSelect;
export type StickerAgentEvent = typeof stickerAgentEvents.$inferSelect;
export type StickerExport = typeof stickerExports.$inferSelect;
