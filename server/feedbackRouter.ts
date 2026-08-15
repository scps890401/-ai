import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { consumeFeedbackRateLimit, createFeedback, listFeedback, listPublicFeedback, addFeedbackVote, updateFeedbackStatus, updateFeedbackVisibility } from "./feedback";
import { ENV } from "./_core/env";

export const feedbackCategorySchema = z.enum(["suggestion", "bug", "feature", "other"]);
export const feedbackStatusSchema = z.enum(["new", "reviewing", "resolved"]);
export const feedbackSubmitInput = z.object({
  category: feedbackCategorySchema,
  message: z.string().trim().min(5, "請至少輸入 5 個字").max(2000),
  contact: z.string().trim().max(320).optional(),
  page: z.string().trim().max(255).optional(),
});
export const feedbackStatusInput = z.object({ id: z.number().int().positive(), status: feedbackStatusSchema });
export const feedbackVisibilityInput = z.object({ id: z.number().int().positive(), isPublic: z.boolean() });
export const feedbackSortInput = z.enum(["latest", "popular"]);
export const feedbackVoteInput = z.object({ id: z.number().int().positive(), voterToken: z.string().trim().min(16).max(128).optional() });

const categorySchema = feedbackCategorySchema;
const statusSchema = feedbackStatusSchema;

const categoryLabel: Record<z.infer<typeof categorySchema>, string> = {
  suggestion: "使用建議",
  bug: "錯誤回報",
  feature: "功能需求",
  other: "其他",
};

export function buildFeedbackNotificationContent(input: { message: string; page?: string; contact?: string }) {
  return `${input.message}\n\n來源頁面：${input.page || "未提供"}\n聯絡方式：${input.contact || "未提供"}`;
}

export function buildFeedbackSubmissionResult<T>(item: T, notified: boolean) {
  return { item, notified };
}

function buildVoterKey(ctx: { req: { headers: Record<string, string | string[] | undefined>; ip?: string }; user: { id: number } | null }, voterToken?: string) {
  if (ctx.user) return `user:${ctx.user.id}`;
  if (voterToken) return `token:${createHash("sha256").update(`${ENV.cookieSecret}:${voterToken}`).digest("hex")}`;
  const forwarded = ctx.req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : ctx.req.ip || "unknown";
  return `ip:${createHash("sha256").update(`${ENV.cookieSecret}:${ip}`).digest("hex")}`;
}

export const feedbackRouter = router({
  submit: publicProcedure
    .input(feedbackSubmitInput)
    .mutation(async ({ input, ctx }) => {
      const forwarded = ctx.req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : ctx.req.ip || "unknown";
      const actorKey = ctx.user ? `user:${ctx.user.id}` : `ip:${ip}`;
      if (!consumeFeedbackRateLimit(actorKey)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "回饋提交過於頻繁，請 10 分鐘後再試。" });
      }
      const item = await createFeedback({ ...input, userId: ctx.user?.id });
      const notified = await notifyOwner({
        title: `Sticker Muse 新回饋｜${categoryLabel[input.category]}`,
        content: buildFeedbackNotificationContent(input),
      });
      return buildFeedbackSubmissionResult(item, notified);
    }),
  publicList: publicProcedure.input(z.object({ sort: feedbackSortInput }).optional()).query(({ input }) => listPublicFeedback(input?.sort ?? "latest")),
  vote: publicProcedure.input(feedbackVoteInput).mutation(({ input, ctx }) => addFeedbackVote(input.id, buildVoterKey(ctx, input.voterToken))),
  list: adminProcedure.query(() => listFeedback()),
  updateStatus: adminProcedure
    .input(feedbackStatusInput)
    .mutation(({ input }) => updateFeedbackStatus(input.id, input.status)),
  updateVisibility: adminProcedure
    .input(feedbackVisibilityInput)
    .mutation(({ input }) => updateFeedbackVisibility(input.id, input.isPublic)),
});
