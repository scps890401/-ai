/**
 * Style reminder — 靜水編輯室：所有資料模型僅服務於安靜、可延伸的對話流，避免與 Phase 1 無關的功能狀態。
 */

export type Attachment = {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
};

export type ChatMessageData = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
};
