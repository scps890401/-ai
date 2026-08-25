import { z } from "zod";
import { invokeLLM, type Message } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";
import { MAX_REFERENCE_IMAGES } from "@shared/const";

export const stickerChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const stickerChatInput = z.object({
  messages: z.array(stickerChatMessage).min(1).max(24),
  uploadedCount: z.number().int().min(0).max(MAX_REFERENCE_IMAGES).default(0),
  attachmentNames: z.array(z.string().max(160)).max(MAX_REFERENCE_IMAGES).default([]),
  hasGeneratedResult: z.boolean().default(false),
  latestGeneratedLabel: z.string().max(200).default(""),
  learnedIdeas: z.array(z.object({
    sourceMode: z.enum(["agent", "manual"]),
    text: z.string().trim().min(1).max(255),
    action: z.string().trim().min(1).max(255),
    creative: z.string().trim().max(500).default(""),
  })).max(8).default([]),
  currentPackSize: z.union([z.literal(8), z.literal(16), z.literal(24), z.literal(32), z.literal(40)]).default(8),
  characterSummary: z.string().trim().max(4000).default(""),
  projectStatus: z.enum(["draft", "generating", "paused", "completed"]).default("draft"),
  continueRequested: z.boolean().default(false),
});

export const stickerPlanItemSchema = z.object({
  position: z.number().int().min(1).max(40),
  text: z.string().max(160),
  action: z.string().max(500),
  emotion: z.string().max(120),
  composition: z.string().max(600),
  prompt: z.string().max(1200),
  sourceIndex: z.number().int().min(0).max(3).default(0),
});

export const characterUpdateSchema = z.object({
  species: z.string().max(120),
  appearance: z.string().max(1200),
  clothing: z.string().max(600),
  accessories: z.string().max(600),
  styleAnchors: z.string().max(800),
  preserve: z.array(z.string().max(160)).max(12),
  negative: z.array(z.string().max(160)).max(12),
});

export const stickerChatPlanSchema = z.object({
  intent: z.enum(["general", "sticker", "random", "agent", "manual", "lottery", "refine"]),
  projectAction: z.enum(["chat", "create", "revise_plan", "generate", "resume"]).default("chat"),
  reply: z.string().min(1).max(1200),
  shouldAskChoice: z.boolean(),
  needsClarification: z.boolean().default(false),
  readyToGenerate: z.boolean(),
  mode: z.enum(["random", "agent", "manual"]).nullable(),
  packSize: z.union([z.literal(8), z.literal(16), z.literal(24), z.literal(32), z.literal(40)]).default(8),
  language: z.string().max(32).default("zh-Hant"),
  style: z.string().max(300).default(""),
  characterUpdate: characterUpdateSchema.nullable().default(null),
  targetPositions: z.array(z.number().int().min(1).max(40)).max(40).default([]),
  planItems: z.array(stickerPlanItemSchema).max(40).default([]),
  prompt: z.string().max(500),
  action: z.string().max(500),
  text: z.string().max(200),
  creative: z.string().max(500),
  useLottery: z.boolean().default(false),
  useLatestResult: z.boolean().default(false),
});

const CHAT_SYSTEM_PROMPT = `你是 Sticker Muse 的繁體中文貼圖創作助理。你的工作不是只聊天，而是把使用者的意圖整理成可執行的 LINE 貼圖製作計畫。

判斷規則：
1. 使用者只是打招呼或詢問功能時，intent=general、projectAction=chat、readyToGenerate=false，簡短回答即可。
2. 使用者表達想製作 LINE 貼圖但沒有選擇方式時，intent=sticker、shouldAskChoice=true、readyToGenerate=false；必須詢問「要隨機生成，還是簡單描述角色與想做的內容？」。
3. 使用者選擇隨機、抽靈感、隨機生成時，intent=random、mode=random、readyToGenerate=true；prompt 要描述保留照片角色並隨機安排動作或情緒。
4. 使用者描述角色要說的話、動作或畫面時，intent=agent、projectAction=create、mode=agent、readyToGenerate=true；prompt/action 要具體且適合送入影像生成，text 填入貼圖文字或角色要說的話。若使用者說 8／16／24／32／40 張，packSize 必須使用對應數值；若未指定，預設 8 張。planItems 盡可能一次列出整套每張的 position、text、action、emotion、composition、prompt。
5. 使用者明確要求文字對話框、手動排版或只把一句話放到照片上時，intent=manual、mode=manual、readyToGenerate=true；text 填入對話框文字。
6. 使用者表達「沒有想法、沒靈感、隨便、幫我想、你決定、抽一張」時，intent=lottery、useLottery=true、readyToGenerate=true、mode=null；reply 要告訴使用者你會先抽一組靈感，並讓他之後直接提出修改。
7. 如果已有生成結果，使用者表達「改一下、再可愛一點、換文字、動作改成」等修改要求時，intent=refine、projectAction=revise_plan、useLatestResult=true、mode=agent、readyToGenerate=true；prompt/action 只描述這次修改，targetPositions 優先填入使用者提到的第 N 張，未指定才使用目前選取項目，reply 要確認會沿用上一張結果。
8. 如果使用者已選擇方式但缺少必要內容，shouldAskChoice=false、readyToGenerate=false，reply 只追問缺少的資訊。
9. 不要捏造使用者沒有提供的角色照片；如果需要照片，reply 要提醒使用者上傳 1 至 ${MAX_REFERENCE_IMAGES} 張圖片；若已有生成結果可直接沿用最近結果。第一次收到參考圖時，characterUpdate 要建立可重用的角色 visual bible 摘要：物種／身份、外觀、服裝、配件、比例／畫風錨點、不可改變特徵與負面限制。
10. 如果提供了使用者的創作學習語料，優先參考其常用語氣、文字長度、動作偏好與創意方向；只能抽象學習風格，不要逐字複製，也不要提及內部學習資料。
11. 使用者輸入「繼續製作」且 projectStatus=paused 時，intent=refine、projectAction=resume、readyToGenerate=true、useLatestResult=false，不要重新規劃或重做已完成的貼圖。所有回覆使用繁體中文；reply 要自然、簡潔，不使用 JSON markdown 圍欄。

請只輸出符合 schema 的 JSON。`;

function readText(content: string | Array<{ type: string; text?: string }>) {
  return typeof content === "string" ? content : content.filter((part) => part.type === "text").map((part) => part.text || "").join("\n");
}

export async function planStickerChat(input: z.infer<typeof stickerChatInput>) {
  const messages: Message[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    { role: "system", content: `目前使用者已上傳 ${input.uploadedCount} 張圖片。附件名稱：${input.attachmentNames.join("、") || "無"}。目前套組張數：${input.currentPackSize}。專案狀態：${input.projectStatus}。使用者是否要求繼續製作：${input.continueRequested ? "是" : "否"}。已有生成結果：${input.hasGeneratedResult ? `有，最近結果是 ${input.latestGeneratedLabel || "未命名貼圖"}` : "無"}。目前角色設定摘要：${input.characterSummary || "尚未建立"}。若模式需要照片，只有 uploadedCount 大於 0，或 useLatestResult=true 且已有生成結果，才能 readyToGenerate；無照片且沒有生成結果時，沒有想法應使用 lottery。${input.learnedIdeas.length ? `使用者已開啟創作學習，最近的風格樣本如下：${input.learnedIdeas.map((idea) => `文字：${idea.text}；動作：${idea.action}；創意：${idea.creative || "未提供"}`).join("｜")}。請將這些樣本轉化為風格參考。` : "使用者目前沒有可用的創作學習樣本。"}` },
    ...input.messages.map((message) => ({ role: message.role, content: message.content })),
  ];
  const response = await invokeLLM({
    messages,
    maxTokens: 700,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "sticker_chat_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: { type: "string", enum: ["general", "sticker", "random", "agent", "manual", "lottery", "refine"] },
            projectAction: { type: "string", enum: ["chat", "create", "revise_plan", "generate", "resume"] },
            reply: { type: "string" },
            shouldAskChoice: { type: "boolean" },
            needsClarification: { type: "boolean" },
            readyToGenerate: { type: "boolean" },
            mode: { anyOf: [{ type: "string", enum: ["random", "agent", "manual"] }, { type: "null" }] },
            packSize: { type: "integer", enum: [8, 16, 24, 32, 40] },
            language: { type: "string" },
            style: { type: "string" },
            characterUpdate: { anyOf: [{ type: "object", properties: { species: { type: "string" }, appearance: { type: "string" }, clothing: { type: "string" }, accessories: { type: "string" }, styleAnchors: { type: "string" }, preserve: { type: "array", items: { type: "string" } }, negative: { type: "array", items: { type: "string" } } }, required: ["species", "appearance", "clothing", "accessories", "styleAnchors", "preserve", "negative"], additionalProperties: false }, { type: "null" }] },
            targetPositions: { type: "array", items: { type: "integer", minimum: 1, maximum: 40 } },
            planItems: { type: "array", items: { type: "object", properties: { position: { type: "integer", minimum: 1, maximum: 40 }, text: { type: "string" }, action: { type: "string" }, emotion: { type: "string" }, composition: { type: "string" }, prompt: { type: "string" }, sourceIndex: { type: "integer", minimum: 0, maximum: 3 } }, required: ["position", "text", "action", "emotion", "composition", "prompt", "sourceIndex"], additionalProperties: false } },
            prompt: { type: "string" },
            action: { type: "string" },
            text: { type: "string" },
            creative: { type: "string" },
            useLottery: { type: "boolean" },
            useLatestResult: { type: "boolean" },
          },
            required: ["intent", "projectAction", "reply", "shouldAskChoice", "needsClarification", "readyToGenerate", "mode", "packSize", "language", "style", "characterUpdate", "targetPositions", "planItems", "prompt", "action", "text", "creative", "useLottery", "useLatestResult"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Sticker chat planner returned no response");
  const parsed = JSON.parse(readText(content));
  return stickerChatPlanSchema.parse(parsed);
}

export const stickerChatRouter = router({
  plan: publicProcedure.input(stickerChatInput).mutation(({ input }) => planStickerChat(input)),
});
