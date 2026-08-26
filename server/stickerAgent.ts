import sharp from "sharp";
import type { ProviderHealth, ProviderHealthStatus } from "./imageProviders";

export type AgentReferenceRole = "character" | "pose" | "scene" | "style" | "accepted_character" | "accepted_style" | "current_edit";
export type ImageTaskKind = "generate" | "edit" | "cutout";
export type ImageProvider = "gemini-3.1-flash-image" | "gpt-image-2" | "flux-2";

export type AgentReference = {
  url: string;
  role: AgentReferenceRole;
  priority?: number;
  accepted?: boolean;
  source?: "upload" | "anchor" | "version" | "current";
  mimeType?: string;
};

export type RouterCandidate = {
  provider: ImageProvider;
  enabled: boolean;
  reason: string;
  maxReferences: number;
  score: number;
  healthStatus: ProviderHealthStatus | "unknown";
  supportsTextPostprocess: boolean;
};

export type RouterRequirements = {
  requiresHighConsistency?: boolean;
  requiresText?: boolean;
  batchSize?: number;
  speedPriority?: "low" | "balanced" | "high";
  costPriority?: "low" | "balanced" | "high";
};

export type RouterAttempt = {
  provider: ImageProvider;
  startedAt: string;
  outcome: "selected" | "completed" | "failed" | "paused";
  errorKind?: ImageErrorKind;
  message?: string;
};

export type RouterDecision = {
  taskKind: ImageTaskKind;
  selectedProvider: ImageProvider | null;
  candidates: RouterCandidate[];
  referenceSnapshot: AgentReference[];
  attempts: RouterAttempt[];
  reason: string;
  resumeSafe: true;
};

export type ImageErrorKind = "quota" | "transient" | "policy" | "invalid_request" | "unknown";

export type StickerQualityReport = {
  verdict: "pass" | "fail";
  reason: string;
  suggestedFix: string;
  alphaVerified: boolean;
  transparentCoverage: number;
  touchesCanvasEdge: boolean;
  dimensions: string;
  outputReady: boolean;
  retryRecommended: boolean;
  reasons: string[];
  textOverlayPending: true;
  semanticReview: "not_available";
};

const roleRank: Record<AgentReferenceRole, number> = {
  current_edit: 0,
  accepted_character: 1,
  character: 2,
  pose: 3,
  scene: 4,
  accepted_style: 5,
  style: 6,
};

export function inferAttachmentRole(message: string): AgentReferenceRole {
  if (/姿勢|動作|pose|站姿|跳躍|跳起|參考動作/i.test(message)) return "pose";
  if (/背景|場景|scene|環境|構圖參考/i.test(message)) return "scene";
  if (/畫風|風格|style|照這個風格|全部照這個/i.test(message)) return "style";
  return "character";
}

export function buildReferenceSelection(input: { references: AgentReference[]; currentEditUrl?: string; maxReferences?: number }) {
  const candidates = [
    ...(input.currentEditUrl ? [{ url: input.currentEditUrl, role: "current_edit" as const, source: "current" as const }] : []),
    ...input.references,
  ].filter((reference) => Boolean(reference.url));

  const selected = candidates
    .sort((a, b) => {
      const rank = roleRank[a.role] - roleRank[b.role];
      if (rank !== 0) return rank;
      if (Boolean(a.accepted) !== Boolean(b.accepted)) return a.accepted ? -1 : 1;
      return (a.priority ?? 50) - (b.priority ?? 50);
    })
    .filter((reference, index, list) => list.findIndex((candidate) => candidate.url === reference.url) === index)
    .slice(0, input.maxReferences ?? 4);
  return selected;
}

function routerCandidate(input: { provider: ImageProvider; configured: boolean; maxReferences: number; baseScore: number; reason: string; requirements: RouterRequirements; referenceCount: number; health?: ProviderHealth }) {
  const healthStatus = input.health?.status ?? "unknown";
  const healthyEnough = !input.health || ["healthy", "degraded"].includes(input.health.status);
  let score = input.baseScore;
  if (input.requirements.requiresHighConsistency && input.provider === "gemini-3.1-flash-image") score += 16;
  if (input.referenceCount >= 2 && input.provider === "gemini-3.1-flash-image") score += 10;
  if (input.requirements.batchSize && input.requirements.batchSize >= 16 && input.provider === "gemini-3.1-flash-image") score += 8;
  if (input.requirements.speedPriority === "high" && input.provider === "gemini-3.1-flash-image") score += 6;
  if (input.requirements.costPriority === "high" && input.provider === "gemini-3.1-flash-image") score += 5;
  if (input.requirements.requiresText && input.provider === "gpt-image-2") score += 4;
  if (healthStatus === "degraded") score -= 18;
  if (["quota_exhausted", "unavailable", "disabled"].includes(healthStatus)) score = -999;
  const enabled = input.configured && healthyEnough;
  const healthReason = healthStatus === "unknown" ? "尚未執行 health check。" : input.health?.detail ?? "";
  return {
    provider: input.provider,
    enabled,
    maxReferences: input.maxReferences,
    score,
    healthStatus,
    supportsTextPostprocess: true,
    reason: `${input.reason}${input.requirements.requiresText ? " 正式繁中文字會交給伺服器後製。" : ""} ${healthReason}`.trim(),
  } satisfies RouterCandidate;
}

export function routeImageTask(input: { taskKind: ImageTaskKind; references: AgentReference[]; currentEditUrl?: string; requirements?: RouterRequirements; providerHealth?: Partial<Record<ImageProvider, ProviderHealth>> }): RouterDecision {
  const requirements = input.requirements ?? {};
  const referenceCount = input.references.length + (input.currentEditUrl ? 1 : 0);
  const specs = input.taskKind === "cutout"
    ? [
      { provider: "gpt-image-2" as const, configured: true, maxReferences: 1, baseScore: 98, reason: "已整合的影像編修服務優先處理語意去背。" },
      { provider: "gemini-3.1-flash-image" as const, configured: true, maxReferences: 1, baseScore: 54, reason: "可在主要去背服務暫時不可用時維持角色輪廓。" },
      { provider: "flux-2" as const, configured: false, maxReferences: 1, baseScore: 30, reason: "FLUX 尚未設定使用者授權的 API 憑證與商業授權。" },
    ]
    : input.taskKind === "edit"
      ? [
        { provider: "gpt-image-2" as const, configured: true, maxReferences: 4, baseScore: 96, reason: "優先以目前圖片進行局部修改、語意修正與版本延續。" },
        { provider: "gemini-3.1-flash-image" as const, configured: true, maxReferences: 4, baseScore: 76, reason: "可在 GPT Image 暫時不可用時延續角色參考與修改。" },
        { provider: "flux-2" as const, configured: false, maxReferences: 6, baseScore: 50, reason: "FLUX 尚未設定使用者授權的 API 憑證與商業授權。" },
      ]
      : [
        { provider: "gemini-3.1-flash-image" as const, configured: true, maxReferences: 4, baseScore: 90, reason: "優先處理角色、姿勢與風格多參考的一致性貼圖生成。" },
        { provider: "gpt-image-2" as const, configured: true, maxReferences: 4, baseScore: 74, reason: "作為已整合的高保真參考圖後備生成服務。" },
        { provider: "flux-2" as const, configured: false, maxReferences: 6, baseScore: 66, reason: "FLUX 尚未設定使用者授權的 API 憑證與商業授權。" },
      ];
  const candidates = specs.map((spec) => routerCandidate({ ...spec, requirements, referenceCount, health: input.providerHealth?.[spec.provider] })).sort((a, b) => b.score - a.score);
  const selectedProvider = candidates.find((candidate) => candidate.enabled)?.provider ?? null;
  const maxReferences = candidates.find((candidate) => candidate.provider === selectedProvider)?.maxReferences ?? 4;
  return {
    taskKind: input.taskKind,
    selectedProvider,
    candidates,
    referenceSnapshot: buildReferenceSelection({ references: input.references, currentEditUrl: input.currentEditUrl, maxReferences }),
    attempts: selectedProvider ? [{ provider: selectedProvider, startedAt: new Date().toISOString(), outcome: "selected" }] : [],
    reason: selectedProvider ? candidates.find((candidate) => candidate.provider === selectedProvider)!.reason : "沒有健康且已設定的影像 Provider；任務將保存並等待恢復。",
    resumeSafe: true,
  };
}

export function classifyImageError(error: unknown): { kind: ImageErrorKind; fallbackEligible: boolean; message: string } {
  const message = error instanceof Error ? error.message : String(error ?? "未知錯誤");
  if (/content policy|safety|blocked|moderation|prohibited/i.test(message)) return { kind: "policy", fallbackEligible: false, message };
  if (/usage exhausted|failed_precondition|resource_exhausted|quota/i.test(message)) return { kind: "quota", fallbackEligible: true, message };
  if (/\b429\b|\b5\d\d\b|timeout|timed out|network|abort/i.test(message)) return { kind: "transient", fallbackEligible: true, message };
  if (/invalid|unsupported|format|too large|400/i.test(message)) return { kind: "invalid_request", fallbackEligible: false, message };
  return { kind: "unknown", fallbackEligible: false, message };
}

export function appendRouterAttempt(decision: RouterDecision, attempt: RouterAttempt): RouterDecision {
  return { ...decision, attempts: [...decision.attempts.filter((item) => item.outcome !== "selected" || item.provider !== attempt.provider), attempt] };
}

export async function evaluateStickerQuality(buffer: Buffer, input: { phrase?: string } = {}): Promise<StickerQualityReport> {
  const metadata = await sharp(buffer).metadata();
  const reasons: string[] = [];
  const alphaVerified = metadata.hasAlpha === true;
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!alphaVerified) reasons.push("生成結果尚未驗證透明背景，需進入語意去背。");
  if (!width || !height) reasons.push("無法取得圖像尺寸。");
  if (width && height && (width < 64 || height < 64)) reasons.push("來源圖尺寸過小，無法安全用於貼圖輸出。");
  let transparentCoverage = 0;
  let touchesCanvasEdge = false;
  if (width && height) {
    const raw = await sharp(buffer).ensureAlpha().raw().toBuffer();
    let transparent = 0;
    for (let index = 3; index < raw.length; index += 4) {
      const alpha = raw[index] ?? 0;
      if (alpha < 8) transparent += 1;
      if (alpha > 8) {
        const pixel = (index - 3) / 4;
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesCanvasEdge = true;
      }
    }
    transparentCoverage = transparent / (width * height);
    if (transparentCoverage < 0.005) reasons.push("主體外未偵測到透明區域，需重新去背。");
    if (touchesCanvasEdge) reasons.push("主體碰觸畫布邊緣，可能在 LINE 輸出時被裁切。");
  }
  if (input.phrase && input.phrase.length > 20) reasons.push("繁體中文字超過 20 字，需縮短或由程式安全換行。");
  const retryRecommended = reasons.some((reason) => /透明|尺寸|裁切/.test(reason));
  const verdict = retryRecommended ? "fail" as const : "pass" as const;
  return {
    verdict,
    reason: reasons[0] ?? "已通過可決定性圖檔品質檢查；臉部與肢體語意檢查仍需支援視覺模型時才可自動完成。",
    suggestedFix: retryRecommended ? (reasons.some((reason) => /透明/.test(reason)) ? "以目前角色圖重新執行去背與透明背景修正。" : "提高構圖安全邊距後重新生成一次。") : "保留此版本，正式文字交由伺服器後製。",
    alphaVerified,
    transparentCoverage,
    touchesCanvasEdge,
    dimensions: width && height ? `${width}×${height}` : "未知",
    outputReady: verdict === "pass" && alphaVerified && width > 0 && height > 0,
    retryRecommended,
    reasons,
    textOverlayPending: true,
    semanticReview: "not_available",
  };
}

export function shouldAutoRepair(report: StickerQualityReport, qualityAttempt: number) {
  return report.verdict === "fail" && report.retryRecommended && qualityAttempt < 1;
}
