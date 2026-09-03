import { describe, expect, it } from "vitest";
import { OPENAI_ZERO_SPEND_POLICY } from "./provider";

/** This suite is intentionally offline: credentials must never be tested by making provider requests. */
describe("伺服器端 Provider 安全政策", () => {
  it("does not treat an OpenAI key as permission to spend", () => {
    expect(OPENAI_ZERO_SPEND_POLICY.enabled).toBe(false);
    expect(OPENAI_ZERO_SPEND_POLICY.state).toBe("PAID_NOT_ALLOWED");
    expect(OPENAI_ZERO_SPEND_POLICY.freeTierAllowed).toBe(false);
    expect(OPENAI_ZERO_SPEND_POLICY.cost).toBe("PAID");
  });
});
