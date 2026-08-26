import sharp from "sharp";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { renderLinePack, renderLineSticker } from "./lineExport";

describe("LINE 靜態貼圖輸出", () => {
  it("產生 370×320 的透明 PNG 並以伺服器端繁中字型後製文字", async () => {
    const source = await sharp({ create: { width: 12, height: 12, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const transparentPng = `data:image/png;base64,${source.toString("base64")}`;
    const output = await renderLineSticker({ imageUrl: transparentPng, phrase: "早安" });
    const metadata = await sharp(output.buffer).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(370);
    expect(metadata.height).toBe(320);
    expect(metadata.hasAlpha).toBe(true);
    expect(output.report.valid).toBe(true);
    expect(output.report.text).toMatchObject({ source: "server_overlay", phrase: "早安", font: "Noto Sans CJK TC", bounds: { x: 10, lineCount: 1, truncated: false } });
    expect(output.report.safeMarginPx).toBe(10);
    expect(output.buffer.byteLength).toBeLessThanOrEqual(1_000_000);
  });

  it("將較長繁中貼圖文字安全換行並在品質報告保留可檢查的文字邊界", async () => {
    const source = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 20, g: 160, b: 220, alpha: 1 } } }).png().toBuffer();
    const output = await renderLineSticker({ imageUrl: `data:image/png;base64,${source.toString("base64")}`, phrase: "今天也要元氣滿滿快樂喔" });
    expect(output.report.valid).toBe(true);
    expect(output.report.text.bounds).toMatchObject({ x: 10, lineCount: 2, truncated: false });
    expect(output.report.text.bounds!.y + output.report.text.bounds!.height).toBeLessThanOrEqual(310);
  });

  it("以 8 張完成貼圖建立含主圖、聊天室縮圖與品質報告的 LINE ZIP", async () => {
    const source = await sharp({ create: { width: 18, height: 18, channels: 4, background: { r: 20, g: 160, b: 220, alpha: 1 } } }).png().toBuffer();
    const sourceUrl = `data:image/png;base64,${source.toString("base64")}`;
    const output = await renderLinePack({ title: "測試貼圖組", items: Array.from({ length: 8 }, (_, index) => ({ position: index + 1, phrase: `文字${index + 1}`, imageUrl: sourceUrl })) });
    const zip = await JSZip.loadAsync(Buffer.from(output.base64, "base64"));
    expect(Object.keys(zip.files).sort()).toEqual(["LINE-QUALITY-REPORT.json", "main.png", "sticker_01.png", "sticker_02.png", "sticker_03.png", "sticker_04.png", "sticker_05.png", "sticker_06.png", "sticker_07.png", "sticker_08.png", "tab.png"]);
    expect(output.reports).toHaveLength(8);
    expect(output.reports.every((item) => item.valid)).toBe(true);
    expect(output.zipBytes).toBeLessThanOrEqual(60_000_000);
  });
});
