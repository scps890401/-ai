import convert from "heic-convert";

export function isHeicUpload(fileName: string, mimeType: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const normalizedMime = mimeType.trim().toLowerCase();
  return normalizedName.endsWith(".heic")
    || normalizedName.endsWith(".heif")
    || normalizedMime.includes("heic")
    || normalizedMime.includes("heif");
}

export function pngFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.(heic|heif)$/i, "");
  return `${withoutExtension || "image"}.png`;
}

export async function normalizeImageUpload(input: {
  fileName: string;
  mimeType: string;
  data: Buffer;
}) {
  if (!isHeicUpload(input.fileName, input.mimeType)) {
    return { data: input.data, fileName: input.fileName, mimeType: input.mimeType, converted: false };
  }

  const converted = await convert({ buffer: input.data, format: "PNG", quality: 1 });
  return {
    data: Buffer.from(converted),
    fileName: pngFileName(input.fileName),
    mimeType: "image/png",
    converted: true,
  };
}
