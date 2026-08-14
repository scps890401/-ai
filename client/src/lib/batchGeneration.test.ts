import { describe, expect, it } from "vitest";
import { collectBatchResults, createBatchStickerJobs, mergeBatchResults } from "./batchGeneration";
import type { StickerConcept } from "./stickerLanguage";

const concepts: StickerConcept[] = [
  { key: "greeting:早安:揮手", scenarioKey: "greeting", scenario: "問候告別", text: "早安", action: "揮手" },
  { key: "cheer:加油:握拳", scenarioKey: "cheer", scenario: "鼓勵祝賀", text: "加油", action: "握拳" },
  { key: "rest:好累:躺下", scenarioKey: "rest", scenario: "疲憊自嘲", text: "好累", action: "躺下" },
  { key: "thanks:謝謝:鞠躬", scenarioKey: "thanks", scenario: "感謝道歉", text: "謝謝", action: "鞠躬" },
];

describe("batch sticker generation", () => {
  it.each([1, 2, 4])("creates one independent job per %s source", (count) => {
    let cursor = 0;
    const jobs = createBatchStickerJobs(
      Array.from({ length: count }, (_, index) => `source-${index}`),
      "random",
      "",
      Array.from({ length: count }, () => ""),
      () => concepts[cursor++ % concepts.length]!,
      [],
    );
    expect(jobs).toHaveLength(count);
    expect(jobs.map((job) => job.source)).toEqual(Array.from({ length: count }, (_, index) => `source-${index}`));
    expect(new Set(jobs.map((job) => job.scenarioKey)).size).toBe(count);
  });

  it("keeps agent prompt on every source", () => {
    const jobs = createBatchStickerJobs(["a", "b", "c", "d"], "agent", "真棒", ["第一張", "第二張", "第三張", "第四張"], () => concepts[0]!, []);
    expect(jobs).toHaveLength(4);
    expect(jobs.map((job) => job.text)).toEqual(["第一張", "第二張", "第三張", "第四張"]);
  });

  it("keeps successful cards and counts partial failures", () => {
    const jobs = createBatchStickerJobs(["rabbit", "dog", "mouse", "cat"], "agent", "真棒", ["兔子早安", "狗狗真棒", "老鼠好餓", "貓咪收到"], () => concepts[0]!, []);
    const collected = collectBatchResults([
      { job: jobs[0]!, result: { url: "rabbit-result", source: jobs[0]!.source, action: jobs[0]!.action } },
      { job: jobs[1]!, result: null },
      { job: jobs[2]!, result: { url: "mouse-result", source: jobs[2]!.source, action: jobs[2]!.action } },
      { job: jobs[3]!, result: null },
    ]);
    expect(collected.failedCount).toBe(2);
    expect(collected.successful.map(({ result }) => result.url)).toEqual(["rabbit-result", "mouse-result"]);
    expect(collected.successful.map(({ job }) => job.source)).toEqual(["rabbit", "mouse"]);
    expect(collected.successful.map(({ job }) => job.text)).toEqual(["兔子早安", "老鼠好餓"]);
  });

  it("prepends successful batch results and respects pack size", () => {
    expect(mergeBatchResults(["old-1", "old-2"], ["new-1", "new-2", "new-3", "new-4"], 4)).toEqual(["new-1", "new-2", "new-3", "new-4"]);
  });
});
