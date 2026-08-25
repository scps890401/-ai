export const LINE_WIDTH = 370;
export const LINE_HEIGHT = 320;
export const LINE_MAX_FILE_BYTES = 1_024_000;
export const LINE_ZIP_MAX_BYTES = 60 * 1_024 * 1_024;
export const LINE_PACK_SIZES = [8, 16, 24, 32, 40] as const;

export const LINE_OUTPUTS = [
  { key: "main", label: "主圖", size: "240 × 240", width: 240, height: 240, file: "main-image.png" },
  { key: "sticker", label: "貼圖圖片", size: "370 × 320", width: 370, height: 320, file: "sticker-01.png" },
  { key: "chat", label: "聊天縮圖", size: "96 × 74", width: 96, height: 74, file: "chat-thumbnail.png" },
  { key: "label", label: "標籤圖", size: "96 × 74", width: 96, height: 74, file: "sticker-label.png" },
] as const;

export function isValidLinePackSize(count: number): count is (typeof LINE_PACK_SIZES)[number] {
  return LINE_PACK_SIZES.includes(count as (typeof LINE_PACK_SIZES)[number]);
}

export function stickerTextFromLabel(label: string) {
  const [, text = ""] = label.split("／");
  return text.trim().slice(0, 40);
}

export function lineOutputFileName(position: number) {
  return `${String(position).padStart(2, "0")}_sticker.png`;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
}

export async function validateLinePng(blob: Blob, width: number, height: number) {
  const withinSizeLimit = blob.size <= LINE_MAX_FILE_BYTES;
  const result = {
    isPng: blob.type === "image/png",
    hasExpectedDimensions: false,
    hasAlphaChannel: false,
    hasTransparentBackground: false,
    withinSizeLimit,
    valid: false,
  };
  if (!result.isPng || !withinSizeLimit || width <= 0 || height <= 0) return result;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const hasSignature = signature.every((value, index) => bytes[index] === value);
  const hasIhdr = bytes.length >= 29
    && readUint32(bytes, 8) === 13
    && String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!) === "IHDR";
  if (!hasSignature || !hasIhdr) return result;

  const actualWidth = readUint32(bytes, 16);
  const actualHeight = readUint32(bytes, 20);
  const colorType = bytes[25];
  result.hasExpectedDimensions = actualWidth === width && actualHeight === height;
  result.hasAlphaChannel = colorType === 4 || colorType === 6;
  result.hasTransparentBackground = result.hasAlphaChannel;

  // In a browser, inspect the decoded pixels as well. The Node test environment
  // cannot decode images, so the PNG alpha channel is the safe fallback there.
  if (result.hasAlphaChannel && typeof document !== "undefined" && typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        result.hasTransparentBackground = pixels.some((_, index) => index % 4 === 3 && pixels[index]! < 255);
      }
      bitmap.close();
    } catch {
      // Keep the alpha-channel fallback when a browser cannot decode the blob.
    }
  }

  result.valid = result.hasExpectedDimensions && result.hasAlphaChannel && result.hasTransparentBackground;
  return result;
}

export async function buildLineDownloadPlan(blob: Blob, position: number, width = LINE_WIDTH, height = LINE_HEIGHT) {
  const validation = await validateLinePng(blob, width, height);
  return { fileName: lineOutputFileName(position), validation, canDownload: validation.valid };
}

export function isWithinLineZipLimit(totalBytes: number) {
  return Number.isFinite(totalBytes) && totalBytes >= 0 && totalBytes <= LINE_ZIP_MAX_BYTES;
}
