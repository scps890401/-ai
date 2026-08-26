import sharp from "sharp";

export type AgentReferenceRole = "character" | "pose" | "style" | "accepted_character" | "accepted_style" | "current_edit";
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
  alphaVerified: boolean;
  dimensions: string;
  outputReady: boolean;
  retryRecommended: boolean;
  reasons: string[];
  textOverlayPending: true;
};

const roleRank: Record<AgentReferenceRole, number> = {
  current_edit: 0,
  accepted_character: 1,
  character: 2,
  pose: 3,
  accepted_style: 4,
  style: 5,
};

export function inferAttachmentRole(message: string): AgentReferenceRole {
  if (/姿勢|動作|pose|站姿|跳躍|跳起|參考動作/i.test(message)) return "pose";
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

export function routeImageTask(input: { taskKind: ImageTaskKind; references: AgentReference[]; currentEditUrl?: string }): RouterDecision {
  const candidates: RouterCandidate[] = input.taskKind === "cutout"
    ? [
      { provider: "gpt-image-2", enabled: true, maxReferences: 1, reason: "已整合的影像編修服務可處理語意去背。" },
      { provider: "gemini-3.1-flash-image", enabled: true, maxReferences: 1, reason: "可在主要去背服務不可用時協助維持角色輪廓。" },
      { provider: "flux-2", enabled: false, maxReferences: 1, reason: "尚未設定 BFL 或相容平台憑證與商業授權。" },
    ]
    : input.taskKind === "edit"
      ? [
        { provider: "gpt-image-2", enabled: true, maxReferences: 4, reason: "優先以目前圖片進行局部修改與版本延續。" },
        { provider: "gemini-3.1-flash-image", enabled: true, maxReferences: 4, reason: "可支援多輪影像修改與角色參考。" },
        { provider: "flux-2", enabled: false, maxReferences: 6, reason: "尚未設定 BFL 或相容平台憑證與商業授權。" },
      ]
      : [
        { provider: "gemini-3.1-flash-image", enabled: true, maxReferences: 4, reason: "優先處理角色、姿勢與風格多參考的一致性貼圖生成。" },
        { provider: "gpt-image-2", enabled: true, maxReferences: 4, reason: "作為已整合的高保真參考圖後備生成服務。" },
        { provider: "flux-2", enabled: false, maxReferences: 6, reason: "尚未設定 BFL 或相容平台憑證與商業授權。" },
      ];
  const selectedProvider = candidates.find((candidate) => candidate.enabled)?.provider ?? null;
  const maxReferences = candidates.find((candidate) => candidate.provider === selectedProvider)?.maxReferences ?? 4;
  return {
    taskKind: input.taskKind,
    selectedProvider,
    candidates,
    referenceSnapshot: buildReferenceSelection({ references: input.references, currentEditUrl: input.currentEditUrl, maxReferences }),
    attempts: selectedProvider ? [{ provider: selectedProvider, startedAt: new Date().toISOString(), outcome: "selected" }] : [],
    reason: selectedProvider ? candidates.find((candidate) => candidate.provider === selectedProvider)!.reason : "沒有已設定的影像 Provider。",
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

export async function evaluateStickerQuality(buffer: Buffer): Promise<StickerQualityReport> {
  const metadata = await sharp(buffer).metadata();
  const reasons: string[] = [];
  const alphaVerified = metadata.hasAlpha === true;
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!alphaVerified) reasons.push("生成結果尚未驗證透明背景，需進入語意去背。");
  if (!width || !height) reasons.push("無法取得圖像尺寸。");
  if (width && height && (width < 64 || height < 64)) reasons.push("來源圖尺寸過小，僅適合作為受控測試素材。");
  return {
    alphaVerified,
    dimensions: width && height ? `${width}×${height}` : "未知",
    outputReady: alphaVerified && width > 0 && height > 0,
    retryRecommended: !width || !height,
    reasons,
    textOverlayPending: true,
  };
}
