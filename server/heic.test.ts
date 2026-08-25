import { describe, expect, it } from "vitest";
import { isHeicUpload, normalizeImageUpload, pngFileName } from "./heic";

describe("HEIC upload normalization", () => {
  it("detects HEIC and HEIF by filename or MIME type", () => {
    expect(isHeicUpload("portrait.HEIC", "application/octet-stream")).toBe(true);
    expect(isHeicUpload("portrait.bin", "image/heif")).toBe(true);
    expect(isHeicUpload("portrait.jpg", "image/jpeg")).toBe(false);
  });

  it("uses a safe PNG filename for converted uploads", () => {
    expect(pngFileName("portrait.HEIC")).toBe("portrait.png");
    expect(pngFileName(".heif")).toBe("image.png");
  });

  it("keeps non-HEIC uploads unchanged", async () => {
    const data = Buffer.from("jpeg-placeholder");
    await expect(normalizeImageUpload({ fileName: "portrait.jpg", mimeType: "image/jpeg", data })).resolves.toEqual({
      data,
      fileName: "portrait.jpg",
      mimeType: "image/jpeg",
      converted: false,
    });
  });

  it("rejects invalid HEIC bytes instead of storing them as PNG", async () => {
    await expect(normalizeImageUpload({ fileName: "portrait.heic", mimeType: "image/heic", data: Buffer.from("not-heic") })).rejects.toThrow();
  });
});
