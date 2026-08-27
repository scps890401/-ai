/**
 * Tool Registry：只實作企劃層 Mock Tool。任何圖片生成、編輯、裁切或匯出均維持為不可執行的型別介面。
 */

import { tool } from "ai";
import { z } from "zod";
import type { StickerPackPlan, ToolCallMeta } from "@shared/chat";

export const planStickerPackSchema = z.object({
  topic: z.string().min(1).max(120),
  character_description: z.string().min(1).max(240),
  count: z.number().int().min(1).max(48),
});

export type StickerIntentHint = {
  topic: string;
  characterDescription: string;
  count: number;
};

type ToolRegistryOptions = {
  onToolComplete: (toolCall: ToolCallMeta) => void;
};

const countPattern = /(?:做|製作|規劃|改成|要|想要|希望|成為)?\s*(\d{1,2})\s*(?:張|個|款)/;
const stickerKeyword = /貼圖|貼紙|sticker/i;

export function extractStickerIntent(input: string, history: string[]): StickerIntentHint | null {
  const hasStickerContext = stickerKeyword.test(input) || history.some(message => stickerKeyword.test(message));
  if (!hasStickerContext) return null;

  const countMatch = input.match(countPattern);
  const recentPlan = [...history].reverse().find(message => stickerKeyword.test(message)) ?? input;
  const removeCountPhrase = (value: string) => value.replace(/\d{1,2}\s*(?:張|個|款)/g, " ");
  const characterMatch = (removeCountPhrase(input).match(/(?:可愛|搞怪|療癒|傲嬌|慵懶|呆萌)?\s*[^，。！？\s]{1,12}(?:貓咪|兔子|狗狗|小熊|角色|動物)/) ?? removeCountPhrase(recentPlan).match(/(?:可愛|搞怪|療癒|傲嬌|慵懶|呆萌)?\s*[^，。！？\s]{1,12}(?:貓咪|兔子|狗狗|小熊|角色|動物)/))?.[0] ?? "原本的角色";
  const topic = recentPlan.replace(/我想|我要|幫我|做|製作|規劃|改成|張|貼圖|貼紙|sticker|\d+/gi, "").replace(/[，。！？]/g, " ").trim() || `${characterMatch} 日常表情`;

  return {
    topic: topic.slice(0, 120),
    characterDescription: characterMatch.trim().slice(0, 240),
    count: Number(countMatch?.[1] ?? (recentPlan.match(countPattern)?.[1] ?? 8)),
  };
}

export function draftStickerPack(input: z.infer<typeof planStickerPackSchema>): StickerPackPlan {
  const topic = input.topic.trim();
  const characterDescription = input.character_description.trim();
  return {
    topic,
    characterDescription,
    count: input.count,
    deliverable: "planning_draft",
    suggestedScenes: [
      "招呼與自我介紹",
      "開心、驚訝與搞怪反應",
      "同意、加油與謝謝",
      "日常情緒與收尾語氣",
    ],
  };
}

export function createAgentTools({ onToolComplete }: ToolRegistryOptions) {
  return {
    plan_sticker_pack: tool({
      description: "建立貼圖包的結構化企劃草稿。使用者要求製作、規劃或調整貼圖數量與角色時必須使用。",
      inputSchema: planStickerPackSchema,
      execute: async input => {
        const output = draftStickerPack(input);
        const toolCall: ToolCallMeta = {
          id: crypto.randomUUID(),
          name: "plan_sticker_pack",
          status: "completed",
          input: {
            topic: input.topic,
            character_description: input.character_description,
            count: input.count,
          },
          output,
        };
        console.info("[Tool] plan_sticker_pack triggered", JSON.stringify(toolCall));
        onToolComplete(toolCall);
        return output;
      },
    }),
  };
}

/**
 * 預留圖片工具的合約。此階段不將它們加入可執行 Tool Set，且不會呼叫任何圖片服務。
 */
export const reservedImageToolInterfaces = {
  generate_sticker_image: {
    enabled: false,
    inputSchema: z.object({ prompt: z.string(), style: z.string().optional() }),
  },
  edit_sticker_image: {
    enabled: false,
    inputSchema: z.object({ imageUrl: z.string().url(), instruction: z.string() }),
  },
} as const;
