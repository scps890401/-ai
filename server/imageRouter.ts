import { generateImage, type GenerateImageOptions, type GenerateImageResponse } from "./_core/imageGeneration";

export type ImageRouteTask = "generate" | "edit" | "analyze";
export type ImageRouteErrorKind = "quota_exhausted" | "rate_limited" | "timeout" | "temporary" | "content_rejected" | "invalid_input" | "unknown";
export type ImageProviderId = "internal-gpt-image-2" | "internal-service-default" | "gemini" | "flux";
export type ReferenceRole = "character" | "style" | "pose" | "scene" | "current";

export type SemanticImageReference = {
  role: ReferenceRole;
  image: NonNullable<GenerateImageOptions["originalImages"]>[number];
  priority: number;
  note?: string;
};

export type ImageRouteRequest = {
  prompt: string;
  originalImages?: NonNullable<GenerateImageOptions["originalImages"]>;
  references?: SemanticImageReference[];
  task: ImageRouteTask;
  finalQuality?: boolean;
  batchSize?: number;
  requiresTraditionalChineseText?: boolean;
  highCharacterConsistency?: boolean;
  preferFast?: boolean;
  preferLowCost?: boolean;
};

export type ImageRouteAttempt = { provider: ImageProviderId; model: string; reason: string; errorKind?: ImageRouteErrorKind; message?: string };
export type ImageRouteResult = { url: string; provider: ImageProviderId; model: string; selectedReason: string; attempts: ImageRouteAttempt[] };
export type ImageGenerator = (options: GenerateImageOptions) => Promise<GenerateImageResponse>;
export type ImageProviderHealth = { provider: ImageProviderId; configured: boolean; healthy: boolean; failures: number; unavailableUntil: number; reason?: string };
export type ImageProviderAdapter = {
  id: ImageProviderId;
  model: string;
  configured: boolean;
  supports: ImageRouteTask[];
  generate: (request: ImageRouteRequest) => Promise<GenerateImageResponse>;
  edit: (request: ImageRouteRequest) => Promise<GenerateImageResponse>;
  analyze: (request: ImageRouteRequest) => Promise<{ summary: string }>;
  healthCheck: () => Promise<ImageProviderHealth>;
};

const providerHealth = new Map<ImageProviderId, { failures: number; unavailableUntil: number }>();

export function classifyImageRouteError(error: unknown): ImageRouteErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/usage exhausted|failed_precondition|credit.*exhausted|insufficient.*quota|spend.*limit|quota exceeded/i.test(message)) return "quota_exhausted";
  if (/429|rate limit|resource_exhausted/i.test(message)) return "rate_limited";
  if (/timeout|timed out|abort/i.test(message)) return "timeout";
  if (/content policy|safety|moderation|rejected/i.test(message)) return "content_rejected";
  if (/400|invalid input|bad request|unsupported mime/i.test(message)) return "invalid_input";
  if (/5\d\d|unavailable|network|fetch failed|service unavailable/i.test(message)) return "temporary";
  return "unknown";
}

export function shouldFallbackImageRoute(kind: ImageRouteErrorKind) {
  return kind === "rate_limited" || kind === "timeout" || kind === "temporary";
}

function referencesForRequest(request: ImageRouteRequest) {
  if (request.references?.length) return [...request.references].sort((a, b) => b.priority - a.priority).map((item) => item.image).slice(0, 4);
  return request.originalImages ?? [];
}

function requestOptions(model: string, request: ImageRouteRequest): GenerateImageOptions {
  const originalImages = referencesForRequest(request);
  return {
    prompt: request.prompt,
    ...(originalImages.length ? { originalImages } : {}),
    model,
    ...(model === "MODEL_GPT_IMAGE_2" ? { quality: request.finalQuality ? "high" : "medium" } : {}),
  };
}

function healthFor(id: ImageProviderId, configured: boolean, now = Date.now()): ImageProviderHealth {
  const stored = providerHealth.get(id) ?? { failures: 0, unavailableUntil: 0 };
  const healthy = configured && stored.unavailableUntil <= now;
  return { provider: id, configured, healthy, failures: stored.failures, unavailableUntil: stored.unavailableUntil, reason: !configured ? "尚未設定此 provider 的伺服器端憑證" : healthy ? undefined : "provider 暫時進入健康度冷卻" };
}

function internalAdapter(id: "internal-gpt-image-2" | "internal-service-default", model: string, imageGenerator: ImageGenerator): ImageProviderAdapter {
  const invoke = (request: ImageRouteRequest) => imageGenerator(requestOptions(model, request));
  return {
    id,
    model,
    configured: true,
    supports: ["generate", "edit", "analyze"],
    generate: invoke,
    edit: invoke,
    analyze: async () => ({ summary: "此 adapter 的影像分析交由 Sticker Quality vision Agent 執行。" }),
    healthCheck: async () => healthFor(id, true),
  };
}

function unavailableAdapter(id: "gemini" | "flux", model: string): ImageProviderAdapter {
  const unavailable = async () => { throw new Error(`${id} provider unavailable: server-side credentials are not configured`); };
  return {
    id,
    model,
    configured: false,
    supports: ["generate", "edit", "analyze"],
    generate: unavailable,
    edit: unavailable,
    analyze: unavailable,
    healthCheck: async () => healthFor(id, false),
  };
}

export function createImageProviderAdapters(imageGenerator: ImageGenerator = generateImage): ImageProviderAdapter[] {
  return [
    internalAdapter("internal-gpt-image-2", "MODEL_GPT_IMAGE_2", imageGenerator),
    internalAdapter("internal-service-default", "MODEL_SERVICE_DEFAULT", imageGenerator),
    unavailableAdapter("gemini", "GEMINI_IMAGE_ADAPTER"),
    unavailableAdapter("flux", "FLUX_IMAGE_ADAPTER"),
  ];
}

export const IMAGE_PROVIDER_REGISTRY = createImageProviderAdapters().map(({ id, model, configured, supports }) => ({ id, model, configured, supports }));

export function selectImageProviderCandidates(request: ImageRouteRequest, now = Date.now(), adapters = createImageProviderAdapters()) {
  const roles = new Set(request.references?.map((reference) => reference.role) ?? []);
  const hasCharacterTask = request.highCharacterConsistency || roles.has("character") || roles.has("pose") || roles.has("style");
  const preferred: ImageProviderId[] = request.task === "edit" || roles.has("current")
    ? ["internal-gpt-image-2", "internal-service-default", "gemini", "flux"]
    : hasCharacterTask
      ? ["gemini", "flux", "internal-gpt-image-2", "internal-service-default"]
      : request.preferFast || request.preferLowCost || (request.batchSize ?? 1) >= 16
        ? ["internal-service-default", "internal-gpt-image-2", "gemini", "flux"]
        : ["internal-gpt-image-2", "internal-service-default", "gemini", "flux"];
  return preferred.filter((id) => {
    const adapter = adapters.find((item) => item.id === id);
    const health = healthFor(id, Boolean(adapter?.configured), now);
    return Boolean(adapter?.configured && adapter.supports.includes(request.task) && health.healthy);
  });
}

export function describeImageRouteSelection(request: ImageRouteRequest, provider: ImageProviderId) {
  const roles = request.references?.map((reference) => reference.role) ?? [];
  if (request.task === "edit" || roles.includes("current")) return `${provider}：目標是局部修改／延續當前圖片，優先選擇 edit 能力。`;
  if (roles.includes("character") || roles.includes("pose") || roles.includes("style") || request.highCharacterConsistency) return `${provider}：此任務需要語義角色、姿勢或風格參考。`;
  if ((request.batchSize ?? 1) >= 16 || request.preferFast || request.preferLowCost) return `${provider}：此任務偏向較大批量、速度或成本效率。`;
  if (request.requiresTraditionalChineseText) return `${provider}：圖內文字不作正式結果，將由 LINE 匯出後製繁中繪字。`;
  return `${provider}：使用目前健康且符合一般貼圖生成能力的 provider。`;
}

function recordProviderFailure(provider: ImageProviderId, kind: ImageRouteErrorKind) {
  const current = providerHealth.get(provider) ?? { failures: 0, unavailableUntil: 0 };
  const failures = current.failures + 1;
  providerHealth.set(provider, { failures, unavailableUntil: shouldFallbackImageRoute(kind) ? Date.now() + Math.min(60_000, failures * 5_000) : current.unavailableUntil });
}

export function resetImageProviderHealth() { providerHealth.clear(); }

export async function inspectImageProviderHealth(adapters = createImageProviderAdapters()) {
  return Promise.all(adapters.map((adapter) => adapter.healthCheck()));
}

export async function routeStickerImage(request: ImageRouteRequest, imageGenerator: ImageGenerator = generateImage): Promise<ImageRouteResult> {
  const adapters = createImageProviderAdapters(imageGenerator);
  const candidates = selectImageProviderCandidates(request, Date.now(), adapters);
  const attempts: ImageRouteAttempt[] = [];
  if (!candidates.length) throw new Error("No healthy image provider is currently available");
  let lastError: unknown;
  for (const provider of candidates) {
    const adapter = adapters.find((item) => item.id === provider)!;
    const reason = describeImageRouteSelection(request, provider);
    try {
      const result = request.task === "edit" ? await adapter.edit(request) : await adapter.generate(request);
      if (!result.url) throw new Error("AI image generation returned no image URL");
      providerHealth.delete(provider);
      return { url: result.url, provider, model: adapter.model, selectedReason: reason, attempts };
    } catch (error) {
      lastError = error;
      const errorKind = classifyImageRouteError(error);
      attempts.push({ provider, model: adapter.model, reason, errorKind, message: error instanceof Error ? error.message : String(error) });
      recordProviderFailure(provider, errorKind);
      if (!shouldFallbackImageRoute(errorKind)) break;
    }
  }
  const suffix = attempts.map((attempt) => `${attempt.provider}:${attempt.errorKind}`).join(", ");
  throw new Error(`Image route failed (${suffix || "unknown"}): ${lastError instanceof Error ? lastError.message : String(lastError ?? "unknown")}`);
}
