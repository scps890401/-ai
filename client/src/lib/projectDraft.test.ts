import { describe, expect, it } from "vitest";
import { getOrCreateGuestKey, projectSnapshotStatus, readProjectId, serializeProjectSnapshot, writeProjectId, type ProjectSnapshot } from "./projectDraft";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

const baseSnapshot: ProjectSnapshot = {
  mode: "agent",
  prompt: "做一組兔子貼圖",
  uploaded: ["/manus-storage/source.jpg"],
  imagePrompts: ["早安"],
  generated: [],
  chatMessages: [{ role: "user", content: "做一組兔子貼圖" }],
  chatAttachmentNames: ["source.jpg"],
  latestGeneratedLabel: "",
  lotteryConcept: null,
  lotteryImageUrl: "",
  packSize: 8,
  learningEnabled: true,
};

describe("projectDraft", () => {
  it("keeps one anonymous browser key stable and stores project id", () => {
    const store = storage();
    const first = getOrCreateGuestKey(store);
    expect(first).toBeTruthy();
    expect(getOrCreateGuestKey(store)).toBe(first);
    writeProjectId(store, 42);
    expect(readProjectId(store)).toBe(42);
  });

  it("serializes a bounded snapshot and derives resumable status", () => {
    const draft = serializeProjectSnapshot(baseSnapshot);
    expect(JSON.parse(draft)).toMatchObject({ prompt: "做一組兔子貼圖", packSize: 8 });
    expect(projectSnapshotStatus(baseSnapshot)).toBe("draft");
    expect(projectSnapshotStatus({ ...baseSnapshot, generated: Array.from({ length: 8 }, (_, index) => ({ src: String(index) })) })).toBe("completed");
  });

  it("rejects invalid stored project ids", () => {
    const store = storage();
    store.setItem("sticker-muse:project-id", "not-a-number");
    expect(readProjectId(store)).toBeNull();
    store.setItem("sticker-muse:project-id", "0");
    expect(readProjectId(store)).toBeNull();
  });
});
