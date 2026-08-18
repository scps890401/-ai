import { z } from "zod";
import { invokeLLM, type Message } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";

export const stickerChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const stickerChatInput = z.object({
  messages: z.array(stickerChatMessage).min(1).max(24),
  uploadedCount: z.number().int().min(0).max(4).default(0),
  attachmentNames: z.array(z.string().max(160)).max(4).default([]),
  hasGeneratedResult: z.boolean().default(false),
  latestGeneratedLabel: z.string().max(200).default(""),
});

export const stickerChatPlanSchema = z.object({
  intent: z.enum(["general", "sticker", "random", "agent", "manual", "lottery", "refine"]),
  reply: z.string().min(1).max(1200),
  shouldAskChoice: z.boolean(),
  readyToGenerate: z.boolean(),
  mode: z.enum(["random", "agent", "manual"]).nullable(),
  prompt: z.string().max(500),
  action: z.string().max(500),
  text: z.string().max(200),
  creative: z.string().max(500),
  useLottery: z.boolean().default(false),
  useLatestResult: z.boolean().default(false),
});

const CHAT_SYSTEM_PROMPT = `你是 Sticker Muse 的繁體中文貼圖創作助理。你的工作不是只聊天，而是把使用者的意圖整理成可執行的 LINE 貼圖製作計畫。

判斷規則：
1. 使用者只是打招呼或詢問功能時，intent=general、readyToGenerate=false，簡短回答即可。
2. 使用者表達想製作 LINE 貼圖但沒有選擇方式時，intent=sticker、shouldAskChoice=true、readyToGenerate=false；必須詢問「要隨機生成，還是簡單描述角色與想做的內容？」。
3. 使用者選擇隨機、抽靈感、隨機生成時，intent=random、mode=random、readyToGenerate=true；prompt 要描述保留照片角色並隨機安排動作或情緒。
4. 使用者描述角色要說的話、動作或畫面時，intent=agent、mode=agent、readyToGenerate=true；prompt/action 要具體且適合送入影像生成，text 填入貼圖文字或角色要說的話。
5. 使用者明確要求文字對話框、手動排版或只把一句話放到照片上時，intent=manual、mode=manual、readyToGenerate=true；text 填入對話框文字。
6. 使用者表達「沒有想法、沒靈感、隨便、幫我想、你決定、抽一張」時，intent=lottery、useLottery=true、readyToGenerate=true、mode=null；reply 要告訴使用者你會先抽一組靈感，並讓他之後直接提出修改。
7. 如果已有生成結果，使用者表達「改一下、再可愛一點、換文字、動作改成」等修改要求時，intent=refine、useLatestResult=true、mode=agent、readyToGenerate=true；prompt/action 只描述這次修改，reply 要確認會沿用上一張結果。
8. 如果使用者已選擇方式但缺少必要內容，shouldAskChoice=false、readyToGenerate=false，reply 只追問缺少的資訊。
9. 不要捏造使用者沒有提供的角色照片；如果需要照片，reply 要提醒使用者上傳 1 至 4 張圖片；若已有生成結果可直接沿用最近結果。
10. 所有回覆使用繁體中文；reply 要自然、簡潔，不使用 JSON markdown 圍欄。

請只輸出符合 schema 的 JSON。`;

function readText(content: string | Array<{ type: string; text?: string }>) {
  return typeof content === "string" ? content : content.filter((part) => part.type === "text").map((part) => part.text || "").join("\n");
}

export async function planStickerChat(input: z.infer<typeof stickerChatInput>) {
  const messages: Message[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    { role: "system", content: `目前使用者已上傳 ${input.uploadedCount} 張圖片。附件名稱：${input.attachmentNames.join("、") || "無"}。已有生成結果：${input.hasGeneratedResult ? `有，最近結果是 ${input.latestGeneratedLabel || "未命名貼圖"}` : "無"}。若模式需要照片，只有 uploadedCount 大於 0，或 useLatestResult=true 且已有生成結果，才能 readyToGenerate；無照片且沒有生成結果時，沒有想法應使用 lottery。` },
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
            reply: { type: "string" },
            shouldAskChoice: { type: "boolean" },
            readyToGenerate: { type: "boolean" },
            mode: { anyOf: [{ type: "string", enum: ["random", "agent", "manual"] }, { type: "null" }] },
            prompt: { type: "string" },
            action: { type: "string" },
            text: { type: "string" },
            creative: { type: "string" },
            useLottery: { type: "boolean" },
            useLatestResult: { type: "boolean" },
          },
          required: ["intent", "reply", "shouldAskChoice", "readyToGenerate", "mode", "prompt", "action", "text", "creative", "useLottery", "useLatestResult"],
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
