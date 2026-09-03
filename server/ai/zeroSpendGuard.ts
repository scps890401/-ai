import type {
  ProviderCostStatus,
  ProviderQuotaStatus,
  ProviderState,
} from "@shared/chat";
import type { ProviderName } from "./provider";

export type ZeroSpendGuardInput = {
  provider: ProviderName;
  enabled: boolean;
  licenseOk: boolean;
  freeTierAllowed: boolean;
  paidFallbackDisabled: boolean;
  quota: ProviderQuotaStatus;
  cost: ProviderCostStatus;
};

export type ZeroSpendGuardDecision = {
  allowed: boolean;
  state: ProviderState;
  reason: string;
};

/**
 * Fail-closed policy. UNKNOWN quota is allowed only when the provider is
 * explicitly licensed for free-tier use and cost is explicitly zero-cost.
 */
export function evaluateZeroSpendGuard(input: ZeroSpendGuardInput): ZeroSpendGuardDecision {
  if (!input.enabled) {
    return { allowed: false, state: "DISABLED", reason: "Provider is disabled." };
  }
  if (!input.licenseOk) {
    return { allowed: false, state: "LICENSE_UNCERTAIN", reason: "Provider license is not confirmed." };
  }
  if (!input.freeTierAllowed) {
    return { allowed: false, state: "PAID_NOT_ALLOWED", reason: "Free-tier use is not allowed." };
  }
  if (!input.paidFallbackDisabled) {
    return { allowed: false, state: "PAID_NOT_ALLOWED", reason: "Paid fallback must be disabled." };
  }
  if (input.quota === "EXHAUSTED") {
    return { allowed: false, state: "QUOTA_EXHAUSTED", reason: "Provider quota is exhausted." };
  }
  if (input.cost !== "ZERO_COST") {
    return { allowed: false, state: "PAID_NOT_ALLOWED", reason: "Request cost is not explicitly zero." };
  }
  return { allowed: true, state: "ENABLED", reason: "Explicitly permitted zero-cost provider." };
}

export function assertZeroSpendAllowed(input: ZeroSpendGuardInput): void {
  const decision = evaluateZeroSpendGuard(input);
  if (!decision.allowed) {
    throw new Error(`ZERO_SPEND_GUARD_BLOCKED:${input.provider}:${decision.state}:${decision.reason}`);
  }
}
