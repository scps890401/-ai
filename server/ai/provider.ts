import type { LanguageModel } from "ai";
import type {
  ProviderAvailability,
  ProviderCostStatus,
  ProviderQuotaStatus,
  ProviderState,
} from "@shared/chat";

export type ProviderName = "google" | "openai";

export type ProviderRequest = {
  model: LanguageModel;
  signal: AbortSignal;
};

export type ProviderAdapter<TResponse = unknown> = {
  provider: ProviderName;
  state: ProviderState;
  request(input: ProviderRequest): Promise<TResponse>;
  healthCheck(): Promise<boolean>;
  quotaStatus(): Promise<ProviderQuotaStatus>;
  costStatus(): Promise<ProviderCostStatus>;
  availability(): Promise<ProviderAvailability>;
};

/**
 * This policy does not guess a quota number. UNKNOWN means the official
 * real-time remaining quota is unavailable, while the request remains allowed
 * only because the provider is explicitly configured as zero-cost.
 */
export const GOOGLE_FREE_TIER_POLICY = {
  provider: "google" as const,
  enabled: true,
  licenseOk: true,
  freeTierAllowed: true,
  paidFallbackDisabled: true,
  quota: "UNKNOWN" as ProviderQuotaStatus,
  cost: "ZERO_COST" as ProviderCostStatus,
};

/** An API key must never activate a paid provider implicitly. */
export const OPENAI_ZERO_SPEND_POLICY = {
  provider: "openai" as const,
  enabled: false,
  licenseOk: false,
  freeTierAllowed: false,
  paidFallbackDisabled: true,
  quota: "UNKNOWN" as ProviderQuotaStatus,
  cost: "PAID" as ProviderCostStatus,
  state: "PAID_NOT_ALLOWED" as ProviderState,
};

export function createOpenAIAdapter(): ProviderAdapter<never> {
  return {
    provider: "openai",
    state: "PAID_NOT_ALLOWED",
    request: async () => {
      throw new Error("ZERO_SPEND_GUARD_BLOCKED:openai:PAID_NOT_ALLOWED:Paid provider is disabled.");
    },
    healthCheck: async () => false,
    quotaStatus: async () => "UNKNOWN",
    costStatus: async () => "PAID",
    availability: async () => "UNAVAILABLE",
  };
}

export function createGoogleAdapter(model: LanguageModel): ProviderAdapter<LanguageModel> {
  return {
    provider: "google",
    state: "ENABLED",
    request: async input => input.model,
    healthCheck: async () => true,
    quotaStatus: async () => GOOGLE_FREE_TIER_POLICY.quota,
    costStatus: async () => GOOGLE_FREE_TIER_POLICY.cost,
    availability: async () => "AVAILABLE",
  };
}
