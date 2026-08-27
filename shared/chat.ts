/**
 * Phase 2 共享聊天契約：附件僅傳遞可安全引用的資料 URL 或 S3 URL；檔案位元組永不寫入資料庫。
 */

export type AttachmentSource =
  | { kind: "data_url"; value: string }
  | { kind: "s3_url"; value: string };

export type AttachmentMeta = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  source?: AttachmentSource;
};

export type StickerPackPlan = {
  topic: string;
  characterDescription: string;
  count: number;
  deliverable: "planning_draft";
  suggestedScenes: string[];
};

export type ToolCallMeta = {
  id: string;
  name: "plan_sticker_pack" | "generate_sticker_image" | "edit_sticker_image";
  status: "completed" | "reserved";
  input: Record<string, unknown>;
  output?: StickerPackPlan;
};

export type PersistedChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  attachments: AttachmentMeta[];
  toolCalls: ToolCallMeta[];
  createdAt: string;
};
