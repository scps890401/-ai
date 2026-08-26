import sharp from "sharp";
import { generateImage, listImageModels } from "./_core/imageGeneration";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import type { ImageErrorKind, ImageProvider } from "./stickerAgent";

export type ProviderHealthStatus = "healthy" | "degraded" | "quota_exhausted" | "unavailable" | "disabled";
export type ProviderTaskKind = "generate" | "edit" | "cutout";

export type ProviderReference = { url: string; mimeType?: string; role?: string };
export type ProviderImageResult = { b64Json: string; mimeType: string; provider: ImageProvider; interactionId?: string };
export type ProviderAnalysis = { inspected: number; readable: number; alphaImages: number; dimensions: string[]; summary: string };
export type ProviderHealth = {
  provider: ImageProvider;
  status: ProviderHealthStatus;
  checkedAt: string;
  latencyMs: number;
  configured: boolean;
  supports: ProviderTaskKind[];
  detail: string;
};

export type ImageProviderAdapter = {
  id: ImageProvider;
  supports: ProviderTaskKind[];
  generate(input: { prompt: string; references: ProviderReference[] }): Promise<ProviderImageResult>;
  edit(input: { prompt: string; original: ProviderReference; references?: ProviderReference[] }): Promise<ProviderImageResult>;
  analyze(input: { references: ProviderReference[] }): Promise<ProviderAnalysis>;
  healthCheck(): Promise<ProviderHealth>;
};

export class ImageProviderError extends Error {
  constructor(public readonly provider: ImageProvider, public readonly kind: ImageErrorKind, message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "ImageProviderError";
  }
}

function nowHealth(input: Omit<ProviderHealth, "checkedAt" | "latencyMs">, startedAt: number): ProviderHealth {
  return { ...input, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt };
}

function classifyProviderFailure(provider: ImageProvider, error: unknown): ImageProviderError {
  if (error instanceof ImageProviderError) return error;
  if (error instanceof GeminiImageError) {
    const kind: ImageErrorKind = error.code === "USAGE_EXHAUSTED" ? "quota" : error.retryable ? "transient" : "unknown";
    return new ImageProviderError(provider, kind, error.message, error.retryable);
  }
  const message = error instanceof Error ? error.message : String(error ?? "影像 Provider 發生未知錯誤");
  if (/usage exhausted|failed_precondition|resource_exhausted|quota/i.test(message)) return new ImageProviderError(provider, "quota", message, true);
  if (/\b429\b|\b5\d\d\b|timeout|timed out|network|abort/i.test(message)) return new ImageProviderError(provider, "transient", message, true);
  if (/policy|safety|blocked|moderation|prohibited/i.test(message)) return new ImageProviderError(provider, "policy", message, false);
  if (/invalid|unsupported|format|too large|\b400\b/i.test(message)) return new ImageProviderError(provider, "invalid_request", message, false);
  return new ImageProviderError(provider, "unknown", message, false);
}

async function readImageMetadata(reference: ProviderReference) {
  try {
    const dataMatch = reference.url.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    const buffer = dataMatch ? Buffer.from(dataMatch[2]!, "base64") : Buffer.from(await (await fetch(reference.url)).arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    return { readable: true, alpha: metadata.hasAlpha === true, dimensions: metadata.width && metadata.height ? `${metadata.width}×${metadata.height}` : "未知" };
  } catch {
    return { readable: false, alpha: false, dimensions: "無法讀取" };
  }
}

async function analyzeReferences(references: ProviderReference[]): Promise<ProviderAnalysis> {
  const inspected = await Promise.all(references.map(readImageMetadata));
  const readable = inspected.filter((item) => item.readable);
  return {
    inspected: references.length,
    readable: readable.length,
    alphaImages: readable.filter((item) => item.alpha).length,
    dimensions: readable.map((item) => item.dimensions),
    summary: readable.length === references.length ? `已讀取 ${references.length} 張參考圖。` : `已讀取 ${readable.length}/${references.length} 張參考圖。`,
  };
}

const geminiAdapter: ImageProviderAdapter = {
  id: "gemini-3.1-flash-image",
  supports: ["generate", "edit"],
  async generate(input) {
    try {
      const result = await generateGeminiImage({ prompt: input.prompt, references: input.references.slice(0, 4).map((item) => ({ url: item.url, mimeType: item.mimeType ?? "image/jpeg" })) });
      return { ...result, provider: "gemini-3.1-flash-image" };
    } catch (error) { throw classifyProviderFailure("gemini-3.1-flash-image", error); }
  },
  async edit(input) {
    return this.generate({ prompt: input.prompt, references: [input.original, ...(input.references ?? [])] });
  },
  analyze: ({ references }) => analyzeReferences(references),
  async healthCheck() {
    const startedAt = Date.now();
    if (!process.env.GEMINI_API_KEY) return nowHealth({ provider: "gemini-3.1-flash-image", status: "unavailable", configured: false, supports: ["generate", "edit"], detail: "未設定 GEMINI_API_KEY。" }, startedAt);
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY } });
      if (response.ok) return nowHealth({ provider: "gemini-3.1-flash-image", status: "healthy", configured: true, supports: ["generate", "edit"], detail: "Gemini 模型目錄可讀取。" }, startedAt);
      const status: ProviderHealthStatus = response.status === 429 || response.status === 412 ? "quota_exhausted" : "degraded";
      return nowHealth({ provider: "gemini-3.1-flash-image", status, configured: true, supports: ["generate", "edit"], detail: `Gemini health check 回應 ${response.status}。` }, startedAt);
    } catch {
      return nowHealth({ provider: "gemini-3.1-flash-image", status: "unavailable", configured: true, supports: ["generate", "edit"], detail: "Gemini health check 無法連線。" }, startedAt);
    }
  },
};

const gptAdapter: ImageProviderAdapter = {
  id: "gpt-image-2",
  supports: ["generate", "edit", "cutout"],
  async generate(input) {
    try {
      const result = await generateImage({ prompt: input.prompt, originalImages: input.references, quality: "medium" });
      if (!result.b64Json) throw new Error("GPT Image 沒有回傳可保存的圖片資料");
      return { b64Json: result.b64Json, mimeType: result.mimeType ?? "image/png", provider: "gpt-image-2" };
    } catch (error) { throw classifyProviderFailure("gpt-image-2", error); }
  },
  async edit(input) {
    try {
      const result = await generateImage({ prompt: input.prompt, originalImages: [input.original, ...(input.references ?? [])], quality: "medium" });
      if (!result.b64Json) throw new Error("GPT Image 沒有回傳可保存的修改圖片");
      return { b64Json: result.b64Json, mimeType: result.mimeType ?? "image/png", provider: "gpt-image-2" };
    } catch (error) { throw classifyProviderFailure("gpt-image-2", error); }
  },
  analyze: ({ references }) => analyzeReferences(references),
  async healthCheck() {
    const startedAt = Date.now();
    try {
      const { models } = await listImageModels();
      const configured = models.some((model) => model.id === "gpt-image-2" || model.model === "MODEL_GPT_IMAGE_2");
      return nowHealth({ provider: "gpt-image-2", status: configured ? "healthy" : "unavailable", configured, supports: ["generate", "edit", "cutout"], detail: configured ? "Forge ImageService 可列出 GPT Image 2。" : "Forge ImageService 未列出 GPT Image 2。" }, startedAt);
    } catch (error) {
      const classified = classifyProviderFailure("gpt-image-2", error);
      return nowHealth({ provider: "gpt-image-2", status: classified.kind === "quota" ? "quota_exhausted" : "unavailable", configured: true, supports: ["generate", "edit", "cutout"], detail: "Forge ImageService health check 暫時不可用。" }, startedAt);
    }
  },
};

const fluxAdapter: ImageProviderAdapter = {
  id: "flux-2",
  supports: [],
  async generate() { throw new ImageProviderError("flux-2", "invalid_request", "FLUX Provider 尚未設定使用者授權的 API 憑證與商業授權。", false); },
  async edit() { throw new ImageProviderError("flux-2", "invalid_request", "FLUX Provider 尚未設定使用者授權的 API 憑證與商業授權。", false); },
  analyze: ({ references }) => analyzeReferences(references),
  async healthCheck() {
    return nowHealth({ provider: "flux-2", status: "disabled", configured: false, supports: [], detail: "FLUX 連接器存在但未啟用；未持有 BFL 或相容 Provider 的使用者憑證。" }, Date.now());
  },
};

const adapters: Record<ImageProvider, ImageProviderAdapter> = {
  "gemini-3.1-flash-image": geminiAdapter,
  "gpt-image-2": gptAdapter,
  "flux-2": fluxAdapter,
};

export function getImageProviderAdapter(provider: ImageProvider) { return adapters[provider]; }

export async function getProviderHealthSnapshot() {
  const health = await Promise.all(Object.values(adapters).map((adapter) => adapter.healthCheck()));
  return Object.fromEntries(health.map((item) => [item.provider, item])) as Record<ImageProvider, ProviderHealth>;
}

export async function executeProviderTask(input: { provider: ImageProvider; taskKind: ProviderTaskKind; prompt: string; references: ProviderReference[]; currentImage?: ProviderReference }) {
  const adapter = getImageProviderAdapter(input.provider);
  if (input.provider === "flux-2") throw new ImageProviderError("flux-2", "invalid_request", "FLUX Provider 尚未設定使用者授權的 API 憑證與商業授權。", false);
  if (!adapter.supports.includes(input.taskKind)) throw new ImageProviderError(input.provider, "invalid_request", `${input.provider} 不支援 ${input.taskKind} 工作。`, false);
  if (input.taskKind === "edit") {
    if (!input.currentImage) throw new ImageProviderError(input.provider, "invalid_request", "圖片修改缺少目前版本圖片。", false);
    return adapter.edit({ prompt: input.prompt, original: input.currentImage, references: input.references });
  }
  return adapter.generate({ prompt: input.prompt, references: input.references });
}
