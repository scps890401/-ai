import { describe, expect, it } from "vitest";
import { buildLineDownloadPlan, isValidLinePackSize, isWithinLineZipLimit, lineOutputFileName, stickerTextFromLabel, validateLinePng } from "./lineExport";

describe("LINE export helpers", () => {
  it("accepts only LINE sticker pack sizes", () => {
    expect(isValidLinePackSize(8)).toBe(true);
    expect(isValidLinePackSize(40)).toBe(true);
    expect(isValidLinePackSize(10)).toBe(false);
  });

  it("keeps ordered filenames and extracts Traditional Chinese text", () => {
    expect(lineOutputFileName(3)).toBe("03_sticker.png");
    expect(stickerTextFromLabel("兔子／早安，今天也要加油")).toBe("早安，今天也要加油");
  });

  it("checks PNG signature, dimensions, alpha channel, and file-size requirements", async () => {
    const rgbaPngHeader = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10,
      0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 1, 114, 0, 0, 1, 64, 8, 6, 0, 0, 0, 0,
    ]);
    expect((await validateLinePng(new Blob([rgbaPngHeader], { type: "image/png" }), 370, 320)).valid).toBe(true);
    expect((await validateLinePng(new Blob([rgbaPngHeader], { type: "image/png" }), 240, 240)).hasExpectedDimensions).toBe(false);
    expect((await validateLinePng(new Blob(["jpg"], { type: "image/jpeg" }), 370, 320)).valid).toBe(false);
    expect((await validateLinePng(new Blob(["not-png"], { type: "image/png" }), 370, 320)).isPng).toBe(true);
    expect((await validateLinePng(new Blob([new Uint8Array(1_024_001)], { type: "image/png" }), 370, 320)).withinSizeLimit).toBe(false);
  });

  it("gates a single PNG download with the validated filename", async () => {
    const rgbaPngHeader = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10,
      0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 1, 114, 0, 0, 1, 64, 8, 6, 0, 0, 0, 0,
    ]);
    const plan = await buildLineDownloadPlan(new Blob([rgbaPngHeader], { type: "image/png" }), 1);
    expect(plan.fileName).toBe("01_sticker.png");
    expect(plan.canDownload).toBe(true);
    const rejected = await buildLineDownloadPlan(new Blob(["jpg"], { type: "image/jpeg" }), 1);
    expect(rejected.canDownload).toBe(false);
  });

  it("enforces the LINE ZIP total size limit", () => {
    expect(isWithinLineZipLimit(0)).toBe(true);
    expect(isWithinLineZipLimit(60 * 1024 * 1024)).toBe(true);
    expect(isWithinLineZipLimit(60 * 1024 * 1024 + 1)).toBe(false);
    expect(isWithinLineZipLimit(Number.NaN)).toBe(false);
  });
});
