import { generateImage, type GenerateImageOptions, type GenerateImageResponse } from "./_core/imageGeneration";

export type ImageRouteTask = "generate" | "edit";
export type ImageRouteErrorKind = "quota_exhausted" | "rate_limited" | "timeout" | "temporary" | "content_rejected" | "invalid_input" | "unknown";
export type ImageProviderId = "internal-gpt-image-2" | "internal-service-default" | "gemini" | "flux";

export type ImageRouteRequest = {
  prompt: string;
  originalImages?: NonNullable<GenerateImageOptions["originalImages"]>;
  task: ImageRouteTask;
  finalQuality?: boolean;
};

export type ImageRouteAttempt = { provider: ImageProviderId; errorKind?: ImageRouteErrorKind; message?: string };
export type ImageRouteResult = { url: string; provider: ImageProviderId; attempts: ImageRouteAttempt[] };
export type ImageGenerator = (options: GenerateImageOptions) => Promise<GenerateImageResponse>;

export const IMAGE_PROVIDER_REGISTRY: Array<{ id: ImageProviderId; configured: boolean; supports: ImageRouteTask[] }> = [
  { id: "internal-gpt-image-2", configured: true, supports: ["generate", "edit"] },
  { id: "internal-service-default", configured: true, supports: ["generate", "edit"] },
  // The adapters stay deliberately disabled until project-owned credentials are
  // configured. They are registry entries, not deceptive user-facing model choices.
  { id: "gemini", configured: false, supports: ["generate", "edit"] },
  { id: "flux", configured: false, supports: ["generate", "edit"] },
];

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

export function selectImageProviderCandidates(request: ImageRouteRequest, now = Date.now()) {
  const preferred: ImageProviderId[] = request.task === "edit"
    ? ["internal-gpt-image-2", "internal-service-default"]
    : ["internal-gpt-image-2", "internal-service-default"];
  return preferred.filter((id) => {
    const provider = IMAGE_PROVIDER_REGISTRY.find((item) => item.id === id);
    const health = providerHealth.get(id);
    return Boolean(provider?.configured && provider.supports.includes(request.task) && (!health || health.unavailableUntil <= now));
  });
}

function optionsForProvider(provider: ImageProviderId, request: ImageRouteRequest): GenerateImageOptions {
  if (provider === "internal-gpt-image-2") {
    return { prompt: request.prompt, originalImages: request.originalImages, model: "MODEL_GPT_IMAGE_2", quality: request.finalQuality ? "high" : "medium" };
  }
  // The ImageService service default is intentionally used as a distinct fallback.
  // The core helper recognizes this sentinel and omits the model field.
  return { prompt: request.prompt, originalImages: request.originalImages, model: "MODEL_SERVICE_DEFAULT" };
}

function recordProviderFailure(provider: ImageProviderId, kind: ImageRouteErrorKind) {
  const current = providerHealth.get(provider) ?? { failures: 0, unavailableUntil: 0 };
  const failures = current.failures + 1;
  providerHealth.set(provider, {
    failures,
    unavailableUntil: shouldFallbackImageRoute(kind) ? Date.now() + Math.min(60_000, failures * 5_000) : current.unavailableUntil,
  });
}

export function resetImageProviderHealth() {
  providerHealth.clear();
}

export async function routeStickerImage(request: ImageRouteRequest, imageGenerator: ImageGenerator = generateImage): Promise<ImageRouteResult> {
  const candidates = selectImageProviderCandidates(request);
  const attempts: ImageRouteAttempt[] = [];
  if (!candidates.length) throw new Error("No healthy image provider is currently available");
  let lastError: unknown;
  for (const provider of candidates) {
    try {
      const result = await imageGenerator(optionsForProvider(provider, request));
      if (!result.url) throw new Error("AI image generation returned no image URL");
      providerHealth.delete(provider);
      return { url: result.url, provider, attempts };
    } catch (error) {
      lastError = error;
      const errorKind = classifyImageRouteError(error);
      attempts.push({ provider, errorKind, message: error instanceof Error ? error.message : String(error) });
      recordProviderFailure(provider, errorKind);
      if (!shouldFallbackImageRoute(errorKind)) break;
    }
  }
  const suffix = attempts.map((attempt) => `${attempt.provider}:${attempt.errorKind}`).join(", ");
  throw new Error(`Image route failed (${suffix || "unknown"}): ${lastError instanceof Error ? lastError.message : String(lastError ?? "unknown")}`);
}
