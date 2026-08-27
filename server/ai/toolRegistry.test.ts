import { describe, expect, it } from "vitest";
import { draftStickerPack, extractStickerIntent } from "./toolRegistry";

describe("貼圖企劃意圖與工具骨幹", () => {
  it("能從明確貼圖請求擷取角色與數量", () => {
    expect(extractStickerIntent("我想做 8 張搞怪貓咪的貼圖", [])).toMatchObject({
      characterDescription: "搞怪貓咪",
      count: 8,
    });
  });

  it("能以既有貼圖上下文理解僅調整數量的追問", () => {
    expect(extractStickerIntent("改成 16 張", ["我想做 8 張搞怪貓咪的貼圖"]))
      .toMatchObject({ characterDescription: "搞怪貓咪", count: 16 });
  });

  it("建立只有企劃資料、沒有圖片生成結果的結構化草稿", () => {
    const plan = draftStickerPack({
      topic: "搞怪貓咪日常",
      character_description: "搞怪貓咪",
      count: 16,
    });
    expect(plan).toMatchObject({
      topic: "搞怪貓咪日常",
      characterDescription: "搞怪貓咪",
      count: 16,
      deliverable: "planning_draft",
    });
    expect(plan.suggestedScenes.length).toBeGreaterThan(0);
  });
});
