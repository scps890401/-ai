import { describe, expect, it } from "vitest";
import { formatStickerVersionHistory, parseStickerVersionChatCommand } from "./stickerVersionChat";

describe("sticker version chat commands", () => {
  it("recognizes natural-language version listing", () => {
    expect(parseStickerVersionChatCommand("請查看第 3 張版本歷程")).toEqual({ kind: "list", position: 3 });
    expect(parseStickerVersionChatCommand("第20張有哪些版本？")).toEqual({ kind: "list", position: 20 });
  });

  it("recognizes target-only version restore", () => {
    expect(parseStickerVersionChatCommand("回復第 3 張 V2")).toEqual({ kind: "restore", position: 3, version: 2 });
    expect(parseStickerVersionChatCommand("把第8張還原成版本 1")).toEqual({ kind: "restore", position: 8, version: 1 });
  });

  it("formats a concise in-chat version history", () => {
    expect(formatStickerVersionHistory(3, [{ version: 2, isCurrent: true, changeSummary: "眼睛更大" }, { version: 1, isCurrent: false, changeSummary: "初始版本" }])).toContain("回復第 3 張 V2");
  });
});
