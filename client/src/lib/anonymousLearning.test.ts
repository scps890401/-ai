import { describe, expect, it } from "vitest";
import { ANONYMOUS_LEARNING_KEY, readAnonymousLearning, rememberAnonymousLearning } from "./anonymousLearning";

function storageMock(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    removeItem: () => { value = null; },
  };
}

const idea = (index: number) => ({ sourceMode: "agent" as const, text: `文字 ${index}`, action: `動作 ${index}`, creative: `創意 ${index}` });

describe("anonymous learning", () => {
  it("persists and caps anonymous ideas at the latest eight", () => {
    const storage = storageMock();
    for (let index = 0; index < 10; index += 1) rememberAnonymousLearning(storage, idea(index));
    const result = readAnonymousLearning(storage);
    expect(result).toHaveLength(8);
    expect(result[0]?.text).toBe("文字 9");
    expect(result.at(-1)?.text).toBe("文字 2");
  });

  it("deduplicates the same anonymous idea", () => {
    const storage = storageMock();
    rememberAnonymousLearning(storage, idea(1));
    rememberAnonymousLearning(storage, idea(1));
    expect(readAnonymousLearning(storage)).toHaveLength(1);
  });

  it("ignores malformed stored data", () => {
    const storage = storageMock("not-json");
    expect(readAnonymousLearning(storage)).toEqual([]);
    expect(ANONYMOUS_LEARNING_KEY).toContain("sticker-muse");
  });
});
