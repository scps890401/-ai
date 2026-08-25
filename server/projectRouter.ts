import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { normalizeImageUpload } from "./heic";
import {
  createProject,
  createProjectAsset,
  getProjectForActor,
  listProjectCheckpoints,
  listProjectJobs,
  listProjectsForUser,
  parseProjectState,
  saveProjectSnapshot,
  type ProjectActor,
} from "./projects";

const guestKeySchema = z.string().trim().min(16).max(128);
const projectStateSchema = z.string().max(60000);
const packSizeSchema = z.union([z.literal(8), z.literal(16), z.literal(24), z.literal(32), z.literal(40)]);

function actorFromContext(ctx: { user?: { id: number } | null }, guestKey?: string): ProjectActor {
  if (ctx.user) return { userId: ctx.user.id, guestKey };
  if (guestKey) return { guestKey };
  throw new TRPCError({ code: "UNAUTHORIZED", message: "需要登入或提供本機專案識別碼。" });
}

const projectAccessInput = z.object({
  projectId: z.number().int().positive(),
  guestKey: guestKeySchema.optional(),
});

export const projectRouter = router({
  create: publicProcedure.input(z.object({
    name: z.string().trim().min(1).max(120),
    packSize: packSizeSchema.default(8),
    stateJson: projectStateSchema,
    guestKey: guestKeySchema.optional(),
  })).mutation(async ({ ctx, input }) => {
    const actor = actorFromContext(ctx, input.guestKey);
    const projectId = await createProject({ ...input, actor });
    return { projectId };
  }),

  list: protectedProcedure.query(({ ctx }) => listProjectsForUser(ctx.user.id)),

  get: publicProcedure.input(projectAccessInput).query(async ({ ctx, input }) => {
    const project = await getProjectForActor(input.projectId, actorFromContext(ctx, input.guestKey));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "找不到這個專案，或你沒有存取權限。" });
    return {
      project,
      state: parseProjectState(project.stateJson),
      checkpoints: await listProjectCheckpoints(project.id),
    };
  }),

  saveSnapshot: publicProcedure.input(z.object({
    ...projectAccessInput.shape,
    name: z.string().trim().min(1).max(120).optional(),
    packSize: packSizeSchema,
    stateJson: projectStateSchema,
    status: z.enum(["draft", "generating", "paused", "completed"]).default("draft"),
    reason: z.string().trim().min(1).max(80).default("autosave"),
  })).mutation(async ({ ctx, input }) => {
    const project = await getProjectForActor(input.projectId, actorFromContext(ctx, input.guestKey));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "找不到這個專案，或你沒有存取權限。" });
    const updatedAt = await saveProjectSnapshot({ project, stateJson: input.stateJson, packSize: input.packSize, status: input.status, reason: input.reason });
    return { projectId: project.id, updatedAt };
  }),

  uploadAsset: publicProcedure.input(z.object({
    ...projectAccessInput.shape,
    kind: z.enum(["source", "reference", "generated", "export"]).default("source"),
    position: z.number().int().min(0).max(39).optional(),
    fileName: z.string().trim().min(1).max(160),
    mimeType: z.string().trim().min(1).max(120),
    dataUrl: z.string().max(12_000_000),
  })).mutation(async ({ ctx, input }) => {
    const project = await getProjectForActor(input.projectId, actorFromContext(ctx, input.guestKey));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "找不到這個專案，或你沒有存取權限。" });
    const match = input.dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match || match[1] !== input.mimeType) throw new TRPCError({ code: "BAD_REQUEST", message: "素材格式無效，請重新選擇圖片。" });
    const data = Buffer.from(match[2], "base64");
    if (data.byteLength > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "單張素材不可超過 8 MB。" });
    let normalized;
    try {
      normalized = await normalizeImageUpload({ fileName: input.fileName, mimeType: input.mimeType, data });
    } catch (error) {
      console.error("HEIC conversion failed", error);
      throw new TRPCError({ code: "BAD_REQUEST", message: "HEIC/HEIF 轉 PNG 失敗，請改用 JPG 或 PNG 再試一次。" });
    }
    if (normalized.data.byteLength > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "轉換後的圖片不可超過 8 MB。" });
    const asset = await createProjectAsset({ projectId: project.id, kind: input.kind, position: input.position, fileName: normalized.fileName, mimeType: normalized.mimeType, data: normalized.data });
    return { asset };
  }),

  resume: publicProcedure.input(projectAccessInput).query(async ({ ctx, input }) => {
    const project = await getProjectForActor(input.projectId, actorFromContext(ctx, input.guestKey));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "找不到這個專案，或你沒有存取權限。" });
    const state = parseProjectState(project.stateJson);
    const jobs = await listProjectJobs(project.id);
    const nextJob = jobs.find((job) => job.status !== "completed");
    return {
      project,
      state,
      jobs,
      nextPosition: nextJob?.position ?? null,
      checkpoints: await listProjectCheckpoints(project.id, 20),
      resumeHint: project.status === "paused" || nextJob ? `輸入「繼續製作」即可從第 ${nextJob?.position ?? 1} 張未完成貼圖繼續。` : null,
    };
  }),
});
