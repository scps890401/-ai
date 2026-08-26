import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
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
  isPublic: boolean("isPublic").default(true).notNull(),
  upvotes: int("upvotes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

export const feedbackVotes = mysqlTable("feedback_votes", {
  id: int("id").autoincrement().primaryKey(),
  feedbackId: int("feedbackId").notNull(),
  voterKey: varchar("voterKey", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  feedbackVoterUnique: uniqueIndex("feedback_votes_feedback_voter_unique").on(table.feedbackId, table.voterKey),
}));

export type FeedbackVote = typeof feedbackVotes.$inferSelect;
export type InsertFeedbackVote = typeof feedbackVotes.$inferInsert;

/**
 * Persistent AI studio state. Image bytes stay in S3; these tables keep only
 * ownership, metadata, structured state, and recoverable workflow history.
 */
export const stickerProjects = mysqlTable("sticker_projects", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId"),
  guestKey: varchar("guestKey", { length: 128 }),
  name: varchar("name", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["draft", "generating", "paused", "completed"]).default("draft").notNull(),
  packSize: int("packSize").default(8).notNull(),
  stateJson: text("stateJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastOpenedAt: timestamp("lastOpenedAt").defaultNow().notNull(),
}, (table) => ({
  ownerUpdatedIdx: index("sticker_projects_owner_updated_idx").on(table.ownerUserId, table.updatedAt),
  guestUpdatedIdx: index("sticker_projects_guest_updated_idx").on(table.guestKey, table.updatedAt),
}));

export type StickerProject = typeof stickerProjects.$inferSelect;
export type InsertStickerProject = typeof stickerProjects.$inferInsert;

export const projectAssets = mysqlTable("project_assets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  kind: mysqlEnum("kind", ["source", "reference", "generated", "export"]).notNull(),
  position: int("position"),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  width: int("width"),
  height: int("height"),
  fileSize: int("fileSize"),
  sha256: varchar("sha256", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  projectKindIdx: index("project_assets_project_kind_idx").on(table.projectId, table.kind),
}));

export type ProjectAsset = typeof projectAssets.$inferSelect;
export type InsertProjectAsset = typeof projectAssets.$inferInsert;

export const characterProfiles = mysqlTable("character_profiles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  visualBibleJson: text("visualBibleJson").notNull(),
  referenceAssetIdsJson: text("referenceAssetIdsJson").notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectVersionIdx: index("character_profiles_project_version_idx").on(table.projectId, table.version),
}));

export type CharacterProfile = typeof characterProfiles.$inferSelect;
export type InsertCharacterProfile = typeof characterProfiles.$inferInsert;

export const projectConversations = mysqlTable("project_conversations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectUpdatedIdx: index("project_conversations_project_updated_idx").on(table.projectId, table.updatedAt),
}));

export type ProjectConversation = typeof projectConversations.$inferSelect;
export type InsertProjectConversation = typeof projectConversations.$inferInsert;

export const projectMessages = mysqlTable("project_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  attachmentAssetIdsJson: text("attachmentAssetIdsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationCreatedIdx: index("project_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
}));

export type ProjectMessage = typeof projectMessages.$inferSelect;
export type InsertProjectMessage = typeof projectMessages.$inferInsert;

export const stickerPlans = mysqlTable("sticker_plans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  version: int("version").default(1).notNull(),
  brief: text("brief").notNull(),
  language: varchar("language", { length: 32 }).default("zh-Hant").notNull(),
  style: varchar("style", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  projectVersionIdx: index("sticker_plans_project_version_idx").on(table.projectId, table.version),
}));

export type StickerPlan = typeof stickerPlans.$inferSelect;
export type InsertStickerPlan = typeof stickerPlans.$inferInsert;

export const stickerPlanItems = mysqlTable("sticker_plan_items", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  position: int("position").notNull(),
  text: varchar("text", { length: 160 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  emotion: varchar("emotion", { length: 120 }),
  composition: text("composition"),
  prompt: text("prompt"),
  targetStickerId: int("targetStickerId"),
}, (table) => ({
  planPositionUnique: uniqueIndex("sticker_plan_items_plan_position_unique").on(table.planId, table.position),
}));

export type StickerPlanItem = typeof stickerPlanItems.$inferSelect;
export type InsertStickerPlanItem = typeof stickerPlanItems.$inferInsert;

export const stickerJobs = mysqlTable("sticker_jobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  planItemId: int("planItemId"),
  position: int("position").notNull(),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed", "retrying"]).default("pending").notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  provider: varchar("provider", { length: 80 }),
  model: varchar("model", { length: 120 }),
  routingJson: text("routingJson"),
  qualityJson: text("qualityJson"),
  errorCode: varchar("errorCode", { length: 80 }),
  errorMessage: text("errorMessage"),
  currentAssetId: int("currentAssetId"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectPositionUnique: uniqueIndex("sticker_jobs_project_position_unique").on(table.projectId, table.position),
  projectStatusIdx: index("sticker_jobs_project_status_idx").on(table.projectId, table.status),
}));

export type StickerJob = typeof stickerJobs.$inferSelect;
export type InsertStickerJob = typeof stickerJobs.$inferInsert;

export const stickerJobVersions = mysqlTable("sticker_job_versions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  version: int("version").default(1).notNull(),
  assetId: int("assetId").notNull(),
  editPrompt: text("editPrompt"),
  changeSummary: text("changeSummary"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  jobVersionUnique: uniqueIndex("sticker_job_versions_job_version_unique").on(table.jobId, table.version),
}));

export type StickerJobVersion = typeof stickerJobVersions.$inferSelect;
export type InsertStickerJobVersion = typeof stickerJobVersions.$inferInsert;

export const projectCheckpoints = mysqlTable("project_checkpoints", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  reason: varchar("reason", { length: 80 }).notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  projectCreatedIdx: index("project_checkpoints_project_created_idx").on(table.projectId, table.createdAt),
}));

export type ProjectCheckpoint = typeof projectCheckpoints.$inferSelect;
export type InsertProjectCheckpoint = typeof projectCheckpoints.$inferInsert;

export const projectExports = mysqlTable("project_exports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", ["png", "zip"]).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["processing", "ready", "failed"]).default("processing").notNull(),
  validationJson: text("validationJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  projectCreatedIdx: index("project_exports_project_created_idx").on(table.projectId, table.createdAt),
}));

export type ProjectExport = typeof projectExports.$inferSelect;
export type InsertProjectExport = typeof projectExports.$inferInsert;
