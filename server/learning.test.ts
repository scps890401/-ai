import { describe, expect, it } from "vitest";
import { clearLearnedIdeas, listLearnedIdeas, normalizeLearnedIdea, saveLearnedIdea, type LearningPersistence, type LearnedIdeaInput, type StoredLearnedIdea } from "./learning";

function createMemoryPersistence(): LearningPersistence {
  const rows: Array<StoredLearnedIdea & { userId: number; normalizedKey: string }> = [];
  return {
    async hasDuplicate(userId, normalizedKey) { return rows.some((row) => row.userId === userId && row.normalizedKey === normalizedKey); },
    async insert(input: LearnedIdeaInput, normalizedKey, text, action, creative) { rows.push({ id: rows.length + 1, userId: input.userId, sourceMode: input.sourceMode, text, action, creative, normalizedKey }); },
    async list(userId) { return rows.filter((row) => row.userId === userId); },
    async clear(userId) { const before = rows.length; for (let index = rows.length - 1; index >= 0; index -= 1) if (rows[index]!.userId === userId) rows.splice(index, 1); return before - rows.length; },
  };
}

describe("learned sticker ideas", () => {
  it("normalizes text, action and creative content into a stable dedupe key", () => {
    expect(normalizeLearnedIdea("  真棒 ", " 握拳歡呼 ", "我的狗狗口頭禪 ")).toBe("真棒|握拳歡呼|我的狗狗口頭禪");
  });

  it("deduplicates the same idea for one user", async () => {
    const persistence = createMemoryPersistence();
    const input = { userId: 1, sourceMode: "agent" as const, text: "真棒", action: "握拳歡呼", creative: "狗狗語氣" };
    expect(await saveLearnedIdea(input, persistence)).toEqual({ saved: true, duplicate: false });
    expect(await saveLearnedIdea({ ...input, text: " 真棒 " }, persistence)).toEqual({ saved: false, duplicate: true });
    expect(await listLearnedIdeas(1, persistence)).toHaveLength(1);
  });

  it("isolates users when listing and clearing learning ideas", async () => {
    const persistence = createMemoryPersistence();
    await saveLearnedIdea({ userId: 1, sourceMode: "manual", text: "好餓", action: "抱著肚子", creative: "" }, persistence);
    await saveLearnedIdea({ userId: 2, sourceMode: "manual", text: "晚安", action: "鑽進被子", creative: "" }, persistence);
    expect(await listLearnedIdeas(1, persistence)).toHaveLength(1);
    expect(await listLearnedIdeas(2, persistence)).toHaveLength(1);
    expect(await clearLearnedIdeas(1, persistence)).toEqual({ deleted: 1 });
    expect(await listLearnedIdeas(1, persistence)).toHaveLength(0);
    expect(await listLearnedIdeas(2, persistence)).toHaveLength(1);
  });
});
