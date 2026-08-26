import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { invokeLLM, type Message } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { projectAssets } from "../drizzle/schema";
import { getProjectForActor, type ProjectActor } from "./projects";
import { storageGetSignedUrl } from "./storage";

const guestKeySchema = z.string().trim().min(16).max(128);
const qualityCheckInput = z.object({
  projectId: z.number().int().positive(),
  guestKey: guestKeySchema.optional(),
  assetId: z.number().int().positive(),
  expectedText: z.string().max(160).default(""),
  expectedAction: z.string().max(500).default(""),
  characterSummary: z.string().max(3000).default(""),
});

export const stickerQualitySchema = z.object({
  decision: z.enum(["pass", "retry", "review"]),
  score: z.number().int().min(0).max(100),
  characterConsistent: z.boolean(),
  compositionClear: z.boolean(),
  anatomySafe: z.boolean(),
  textSafe: z.boolean(),
  issues: z.array(z.string().max(300)).max(6),
  retryPrompt: z.string().max(1000),
  summary: z.string().max(500),
});

export type StickerQuality = z.infer<typeof stickerQualitySchema>;

function actorFromContext(ctx: { user?: { id: number } | null }, guestKey?: string): ProjectActor {
  if (ctx.user) return { userId: ctx.user.id, guestKey };
  if (guestKey) return { guestKey };
  throw new Error("需要登入或提供本機專案識別碼。");
}

export function deterministicStickerQuality(asset: { mimeType: string; sizeBytes: number }, expectedText = ""): StickerQuality {
  const issues: string[] = [];
  const isPng = asset.mimeType === "image/png";
  if (!isPng) issues.push("輸出不是 PNG，無法直接符合 LINE 靜態貼圖交付格式。");
  if (asset.sizeBytes > 1_024_000) issues.push("單張檔案超過 1 MB，需要在 LINE 匯出前縮放或壓縮。");
  const retry = issues.length > 0;
  return {
    decision: retry ? "retry" : "review",
    score: retry ? 35 : 70,
    characterConsistent: false,
    compositionClear: false,
    anatomySafe: false,
    textSafe: !expectedText,
    issues,
    retryPrompt: retry ? "輸出透明 PNG，保留角色且不要在圖內生成任何文字。" : "",
    summary: retry ? "檔案規格未通過，應先修正再進行語義品質判斷。" : "已通過 deterministic 檔案檢查，等待視覺品質審核。",
  };
}

const QUALITY_SYSTEM_PROMPT = `你是 Sticker Muse 的貼圖品質檢查 Agent。依序檢查：
1. 角色是否與提供的角色設定一致；2. 動作、表情與構圖是否符合指定情境；3. 是否有多餘肢體、畸形、遮擋、裁切或多角色混入；4. 圖內是否誤產生文字、亂碼或不應存在的符號；5. 是否適合作為透明背景 LINE 貼圖的乾淨主體。
不可捏造看不見的細節。若明確錯誤且可透過重新生成修正，decision=retry 並提供只描述問題修正的 retryPrompt；若有不確定或需要人類美感判斷，decision=review；沒有實質問題才 pass。只輸出符合 JSON schema 的繁體中文。`;

function readText(content: string | Array<{ type: string; text?: string }>) {
  return typeof content === "string" ? content : content.filter((part) => part.type === "text").map((part) => part.text || "").join("\n");
}

export async function evaluateStickerVisualQuality(args: {
  imageUrl: string;
  expectedText: string;
  expectedAction: string;
  characterSummary: string;
}) {
  const messages: Message[] = [
    { role: "system", content: QUALITY_SYSTEM_PROMPT },
    { role: "user", content: [
      { type: "text", text: `角色設定：${args.characterSummary || "未提供；只能就畫面自洽性判斷"}\n預期動作／修改：${args.expectedAction || "未提供"}\n預期繁中貼圖文字：${args.expectedText || "無；圖內不應出現文字"}` },
      { type: "image_url", image_url: { url: args.imageUrl, detail: "high" } },
    ] },
  ];
  const response = await invokeLLM({
    messages,
    maxTokens: 700,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "sticker_quality_review",
        strict: true,
        schema: {
          type: "object",
          properties: {
            decision: { type: "string", enum: ["pass", "retry", "review"] }, score: { type: "integer", minimum: 0, maximum: 100 }, characterConsistent: { type: "boolean" }, compositionClear: { type: "boolean" }, anatomySafe: { type: "boolean" }, textSafe: { type: "boolean" }, issues: { type: "array", items: { type: "string" } }, retryPrompt: { type: "string" }, summary: { type: "string" },
          },
          required: ["decision", "score", "characterConsistent", "compositionClear", "anatomySafe", "textSafe", "issues", "retryPrompt", "summary"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices[0]?.message.content;
  if (!raw) throw new Error("品質檢查沒有回傳結果");
  return stickerQualitySchema.parse(JSON.parse(readText(raw)));
}

export async function checkProjectStickerQuality(input: z.infer<typeof qualityCheckInput>, ctx: { user?: { id: number } | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const project = await getProjectForActor(input.projectId, actorFromContext(ctx, input.guestKey));
  if (!project) throw new Error("找不到這個專案，或你沒有存取權限。");
  const [asset] = await db.select().from(projectAssets).where(and(eq(projectAssets.id, input.assetId), eq(projectAssets.projectId, project.id))).limit(1);
  if (!asset) throw new Error("找不到可檢查的生成圖片。");
  const deterministic = deterministicStickerQuality({ mimeType: asset.mimeType, sizeBytes: asset.fileSize ?? 0 }, input.expectedText);
  if (deterministic.decision === "retry") return { mode: "deterministic" as const, quality: deterministic };
  const quality = await evaluateStickerVisualQuality({
    imageUrl: await storageGetSignedUrl(asset.storageKey),
    expectedText: input.expectedText,
    expectedAction: input.expectedAction,
    characterSummary: input.characterSummary,
  });
  return { mode: "vision" as const, quality };
}

export const stickerQualityRouter = router({
  check: publicProcedure.input(qualityCheckInput).mutation(({ ctx, input }) => checkProjectStickerQuality(input, ctx)),
});
