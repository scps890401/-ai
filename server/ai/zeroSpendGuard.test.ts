import { describe, expect, it } from "vitest";
import { OPENAI_ZERO_SPEND_POLICY } from "./provider";
import { assertZeroSpendAllowed, evaluateZeroSpendGuard } from "./zeroSpendGuard";

describe("ZERO_SPEND_GUARD", () => {
  const allowed = {
    provider: "google" as const,
    enabled: true,
    licenseOk: true,
    freeTierAllowed: true,
    paidFallbackDisabled: true,
    quota: "UNKNOWN" as const,
    cost: "ZERO_COST" as const,
  };

  it("allows unknown quota only when zero-cost permission is explicit", () => {
    expect(evaluateZeroSpendGuard(allowed)).toEqual({
      allowed: true,
      state: "ENABLED",
      reason: "Explicitly permitted zero-cost provider.",
    });
    expect(() => assertZeroSpendAllowed(allowed)).not.toThrow();
  });

  it.each([
    ["disabled", { enabled: false }, "DISABLED"],
    ["uncertain license", { licenseOk: false }, "LICENSE_UNCERTAIN"],
    ["no free tier", { freeTierAllowed: false }, "PAID_NOT_ALLOWED"],
    ["enabled paid fallback", { paidFallbackDisabled: false }, "PAID_NOT_ALLOWED"],
    ["exhausted quota", { quota: "EXHAUSTED" as const }, "QUOTA_EXHAUSTED"],
    ["non-zero cost", { cost: "PAID" as const }, "PAID_NOT_ALLOWED"],
  ])("fails closed for %s", (_label, override, state) => {
    const decision = evaluateZeroSpendGuard({ ...allowed, ...override });
    expect(decision.allowed).toBe(false);
    expect(decision.state).toBe(state);
    expect(() => assertZeroSpendAllowed({ ...allowed, ...override })).toThrow("ZERO_SPEND_GUARD_BLOCKED");
  });

  it("keeps OpenAI disabled even when a key may exist", () => {
    expect(evaluateZeroSpendGuard({
      provider: OPENAI_ZERO_SPEND_POLICY.provider,
      enabled: OPENAI_ZERO_SPEND_POLICY.enabled,
      licenseOk: OPENAI_ZERO_SPEND_POLICY.licenseOk,
      freeTierAllowed: OPENAI_ZERO_SPEND_POLICY.freeTierAllowed,
      paidFallbackDisabled: OPENAI_ZERO_SPEND_POLICY.paidFallbackDisabled,
      quota: OPENAI_ZERO_SPEND_POLICY.quota,
      cost: OPENAI_ZERO_SPEND_POLICY.cost,
    }).state).toBe("DISABLED");
  });
});
