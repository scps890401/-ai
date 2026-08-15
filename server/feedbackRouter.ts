import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { consumeFeedbackRateLimit, createFeedback, listFeedback, listPublicFeedback, updateFeedbackStatus, updateFeedbackVisibility } from "./feedback";

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
  publicList: publicProcedure.query(() => listPublicFeedback()),
  list: adminProcedure.query(() => listFeedback()),
  updateStatus: adminProcedure
    .input(feedbackStatusInput)
    .mutation(({ input }) => updateFeedbackStatus(input.id, input.status)),
  updateVisibility: adminProcedure
    .input(feedbackVisibilityInput)
    .mutation(({ input }) => updateFeedbackVisibility(input.id, input.isPublic)),
});
