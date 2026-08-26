export const PROJECT_GUEST_KEY = "sticker-muse:guest-key";
export const PROJECT_ID_KEY = "sticker-muse:project-id";

export type ProjectStorage = Pick<Storage, "getItem" | "setItem">;

function createGuestKey() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
}

export function getOrCreateGuestKey(storage: ProjectStorage | null): string | null {
  if (!storage) return null;
  const existing = storage.getItem(PROJECT_GUEST_KEY)?.trim();
  if (existing && existing.length >= 16) return existing.slice(0, 128);
  const key = createGuestKey();
  storage.setItem(PROJECT_GUEST_KEY, key);
  return key;
}

export function readProjectId(storage: ProjectStorage | null): number | null {
  const value = storage?.getItem(PROJECT_ID_KEY)?.trim();
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function writeProjectId(storage: ProjectStorage | null, projectId: number) {
  if (!storage || !Number.isSafeInteger(projectId) || projectId <= 0) return;
  storage.setItem(PROJECT_ID_KEY, String(projectId));
}

export type ProjectSnapshot = {
  mode: string;
  prompt: string;
  uploaded: string[];
  sourceAssetIds: number[];
  imagePrompts: string[];
  planItems: unknown[];
  characterProfile: unknown;
  jobStates: Array<{ position: number; status: string; errorMessage?: string }> ;
  generated: unknown[];
  chatMessages: unknown[];
  chatAttachmentNames: string[];
  latestGeneratedLabel: string;
  lotteryConcept: unknown;
  lotteryImageUrl: string;
  packSize: number;
  learningEnabled: boolean;
  referenceAnchors?: ReferenceAnchorState;
  qualityByPosition?: Record<number, { state: "checking" | "pass" | "retry" | "review" | "unavailable"; summary: string }>;
};

export function serializeProjectSnapshot(snapshot: ProjectSnapshot): string {
  const full = JSON.stringify(snapshot);
  if (full.length <= 60000) return full;
  const trimmed = {
    ...snapshot,
    chatMessages: snapshot.chatMessages.slice(-24),
    generated: snapshot.generated.slice(-40),
  } satisfies ProjectSnapshot;
  const compact = JSON.stringify(trimmed);
  if (compact.length <= 60000) return compact;
  return JSON.stringify({
    ...trimmed,
    chatMessages: trimmed.chatMessages.slice(-8),
    generated: trimmed.generated.slice(-16),
  });
}

export function projectSnapshotStatus(snapshot: ProjectSnapshot): "draft" | "generating" | "paused" | "completed" {
  if (snapshot.generated.length >= snapshot.packSize) return "completed";
  const jobStates = Array.isArray(snapshot.jobStates) ? snapshot.jobStates : [];
  const hasQuotaFailure = jobStates.some((job) => job.status === "failed" && /usage exhausted|failed_precondition|quota|rate limit|insufficient/i.test(job.errorMessage ?? ""));
  if (hasQuotaFailure) return "paused";
  return jobStates.some((job) => job.status === "generating" || job.status === "retrying") ? "generating" : "draft";
}
import type { ReferenceAnchorState } from "./referenceAnchors";
