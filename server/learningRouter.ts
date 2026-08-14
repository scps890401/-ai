import { z } from "zod";
import { clearLearnedIdeas, listLearnedIdeas, saveLearnedIdea } from "./learning";
import { protectedProcedure, router } from "./_core/trpc";

const learnedIdeaInput = z.object({
  sourceMode: z.enum(["agent", "manual"]),
  text: z.string().trim().min(1).max(255),
  action: z.string().trim().min(1).max(255),
  creative: z.string().trim().max(2000).optional(),
});

export const learningRouter = router({
  list: protectedProcedure.query(({ ctx }) => listLearnedIdeas(ctx.user.id)),
  save: protectedProcedure.input(learnedIdeaInput).mutation(({ ctx, input }) => saveLearnedIdea({ ...input, userId: ctx.user.id })),
  clear: protectedProcedure.mutation(({ ctx }) => clearLearnedIdeas(ctx.user.id)),
});
