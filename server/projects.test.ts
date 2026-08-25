import { describe, expect, it } from "vitest";
import { resolveStickerJobStatus, shouldCreateStickerJobVersion } from "./projects";

describe("project structured sync", () => {
  it("keeps retrying and failed states for jobs without a generated asset", () => {
    expect(resolveStickerJobStatus({ requestedStatus: "retrying", hasGeneratedAsset: false })).toBe("retrying");
    expect(resolveStickerJobStatus({ requestedStatus: "failed", hasGeneratedAsset: false })).toBe("failed");
    expect(resolveStickerJobStatus({ requestedStatus: "unknown", hasGeneratedAsset: false })).toBe("pending");
  });

  it("does not regress an already completed job during a stale autosave", () => {
    expect(resolveStickerJobStatus({ requestedStatus: "retrying", hasGeneratedAsset: false, existingStatus: "completed" })).toBe("completed");
  });

  it("creates a new version only when generated asset identity changes", () => {
    expect(shouldCreateStickerJobVersion(null, 101)).toBe(true);
    expect(shouldCreateStickerJobVersion(101, 101)).toBe(false);
    expect(shouldCreateStickerJobVersion(101, 102)).toBe(true);
    expect(shouldCreateStickerJobVersion(101, null)).toBe(false);
  });
});
