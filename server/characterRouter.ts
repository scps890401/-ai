import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { invokeLLM, type Message } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";
import { MAX_REFERENCE_IMAGES } from "@shared/const";
import { characterProfiles, projectAssets } from "../drizzle/schema";
import { getDb } from "./db";
import { getProjectForActor, type ProjectActor } from "./projects";
import { storageGetSignedUrl } from "./storage";

const guestKeySchema = z.string().trim().min(16).max(128);
const characterAnalyzeInput = z.object({
  projectId: z.number().int().positive(),
  guestKey: guestKeySchema.optional(),
  sourceAssetIds: z.array(z.number().int().positive()).min(1).max(MAX_REFERENCE_IMAGES),
  hint: z.string().trim().max(1000).default(""),
});

export const characterProfileSchema = z.object({
  species: z.string().max(120),
  identity: z.string().max(300),
  face: z.string().max(800),
  hairOrFur: z.string().max(800),
  body: z.string().max(800),
  clothing: z.string().max(600),
  accessories: z.string().max(600),
  colors: z.string().max(500),
  proportions: z.string().max(500),
  styleAnchors: z.string().max(800),
  preserve: z.array(z.string().max(160)).max(12),
  negative: z.array(z.string().max(160)).max(12),
});

function actorFromContext(ctx: { user?: { id: number } | null }, guestKey?: string): ProjectActor {
  if (ctx.user) return { userId: ctx.user.id, guestKey };
  if (guestKey) return { guestKey };
  throw new Error("需要登入或提供本機專案識別碼。");
}

const CHARACTER_SYSTEM_PROMPT = `你是 Sticker Muse 的角色設定分析師。請只根據參考圖片與使用者提示，建立可供後續 LINE 貼圖生成使用的角色 visual bible。不能捏造圖片中看不到的細節；不確定時請寫「未能從圖片確認」。要特別記錄物種／身份、臉部、毛色或髮型、身體比例、服裝、配件、主色、畫風錨點、不可改變特徵與負面限制。所有文字使用繁體中文，輸出只符合 JSON schema。`;

export async function analyzeCharacter(input: z.infer<typeof characterAnalyzeInput>, ctx: { user?: { id: number } | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const project = await getProjectForActor(input.projectId, actorFromContext(ctx, input.guestKey));
  if (!project) throw new Error("找不到這個專案，或你沒有存取權限。");
  const assets = await db.select().from(projectAssets).where(inArray(projectAssets.id, input.sourceAssetIds));
  const ownedAssets = assets.filter((asset) => asset.projectId === project.id && (asset.kind === "source" || asset.kind === "reference"));
  if (!ownedAssets.length) throw new Error("找不到可分析的角色參考圖。");

  const imageParts = await Promise.all(ownedAssets.slice(0, MAX_REFERENCE_IMAGES).map(async (asset) => ({
    type: "image_url" as const,
    image_url: { url: await storageGetSignedUrl(asset.storageKey), detail: "high" as const },
  })));
  const messages: Message[] = [
    { role: "system", content: CHARACTER_SYSTEM_PROMPT },
    { role: "user", content: [{ type: "text", text: `使用者補充：${input.hint || "請分析圖片中的主要角色，供一整套貼圖維持一致性。"}` }, ...imageParts] },
  ];
  const response = await invokeLLM({
    messages,
    maxTokens: 900,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "sticker_character_profile",
        strict: true,
        schema: {
          type: "object",
          properties: {
            species: { type: "string" }, identity: { type: "string" }, face: { type: "string" }, hairOrFur: { type: "string" }, body: { type: "string" }, clothing: { type: "string" }, accessories: { type: "string" }, colors: { type: "string" }, proportions: { type: "string" }, styleAnchors: { type: "string" }, preserve: { type: "array", items: { type: "string" } }, negative: { type: "array", items: { type: "string" } },
          },
          required: ["species", "identity", "face", "hairOrFur", "body", "clothing", "accessories", "colors", "proportions", "styleAnchors", "preserve", "negative"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices[0]?.message.content;
  const raw = typeof content === "string" ? content : content?.filter((part) => part.type === "text").map((part) => part.text || "").join("\n");
  if (!raw) throw new Error("角色分析沒有回傳結果");
  const profile = characterProfileSchema.parse(JSON.parse(raw));
  const [latest] = await db.select().from(characterProfiles).where(eq(characterProfiles.projectId, project.id)).orderBy(desc(characterProfiles.version)).limit(1);
  await db.insert(characterProfiles).values({
    projectId: project.id,
    name: "主要角色",
    version: (latest?.version ?? 0) + 1,
    visualBibleJson: JSON.stringify(profile),
    referenceAssetIdsJson: JSON.stringify(ownedAssets.map((asset) => asset.id)),
  });
  return { profile, referenceAssetIds: ownedAssets.map((asset) => asset.id) };
}

export const characterRouter = router({
  analyze: publicProcedure.input(characterAnalyzeInput).mutation(({ ctx, input }) => analyzeCharacter(input, ctx)),
});
