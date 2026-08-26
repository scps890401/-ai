import sharp from "sharp";

export type GeminiImageReference = {
  url: string;
  mimeType: string;
};

export type GeminiImageResult = {
  b64Json: string;
  mimeType: "image/jpeg";
  provider: "gemini";
  interactionId?: string;
};

export class GeminiImageError extends Error {
  constructor(message: string, public readonly code?: string, public readonly retryable = false) {
    super(message);
    this.name = "GeminiImageError";
  }
}

function isQuotaOrRateLimit(status: number, detail: string) {
  return status === 429 || status === 412 || /quota|resource_exhausted|rate limit|usage exhausted/i.test(detail);
}

async function readReference(reference: GeminiImageReference) {
  const response = await fetch(reference.url);
  if (!response.ok) throw new GeminiImageError(`無法讀取角色參考圖（${response.status}）`, "REFERENCE_FETCH", true);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { type: "image" as const, mime_type: reference.mimeType, data: bytes.toString("base64") };
}

export async function generateGeminiImage(input: { prompt: string; references?: GeminiImageReference[]; model?: "gemini-3.1-flash-image" | "gemini-3-pro-image" }) {
  if (process.env.STICKER_E2E_TEST_MODE === "1") {
    const buffer = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 239, g: 152, b: 58 } } }).jpeg({ quality: 90 }).toBuffer();
    return { b64Json: buffer.toString("base64"), mimeType: "image/jpeg", provider: "gemini", interactionId: `e2e-${Date.now()}` } satisfies GeminiImageResult;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiImageError("Gemini 圖像服務尚未設定", "MISSING_API_KEY");
  const references = await Promise.all((input.references ?? []).slice(0, 4).map(readReference));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: input.model ?? "gemini-3.1-flash-image",
        input: [{ type: "text", text: input.prompt }, ...references],
        response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "1:1", image_size: "1K" },
      }),
      signal: controller.signal,
    });
    const detail = await response.text();
    if (!response.ok) throw new GeminiImageError(`Gemini 圖像服務錯誤（${response.status}）${detail ? `：${detail.slice(0, 320)}` : ""}`, isQuotaOrRateLimit(response.status, detail) ? "USAGE_EXHAUSTED" : "GEMINI_REQUEST", isQuotaOrRateLimit(response.status, detail));
    const payload = JSON.parse(detail) as { id?: string; interaction_id?: string; output_image?: { data?: string } };
    const b64Json = payload.output_image?.data;
    if (!b64Json) throw new GeminiImageError("Gemini 沒有回傳圖片資料", "EMPTY_IMAGE", true);
    return { b64Json, mimeType: "image/jpeg", provider: "gemini", interactionId: payload.id ?? payload.interaction_id } satisfies GeminiImageResult;
  } catch (error) {
    if (error instanceof GeminiImageError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new GeminiImageError("Gemini 圖像生成逾時，請稍後重試", "TIMEOUT", true);
    throw new GeminiImageError(error instanceof Error ? error.message : "Gemini 圖像服務暫時無法使用", "NETWORK", true);
  } finally {
    clearTimeout(timeout);
  }
}
