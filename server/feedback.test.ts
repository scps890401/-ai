import { describe, expect, it } from "vitest";
import { consumeFeedbackRateLimit, normalizeFeedbackMessage } from "./feedback";
import { buildFeedbackNotificationContent, buildFeedbackSubmissionResult, feedbackStatusInput, feedbackSubmitInput } from "./feedbackRouter";
import { appRouter } from "./routers";

describe("feedback helpers", () => {
  it("trims and normalizes excessive whitespace in submitted feedback", () => {
    expect(normalizeFeedbackMessage("  希望   可以選風格   ")).toBe("希望  可以選風格");
  });

  it("preserves normal line breaks and meaningful content", () => {
    expect(normalizeFeedbackMessage("代理生成很好\n但希望能重試")).toBe("代理生成很好\n但希望能重試");
  });

  it("allows five submissions then blocks the sixth within the window", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    for (let index = 0; index < 5; index += 1) expect(consumeFeedbackRateLimit(key, 1000)).toBe(true);
    expect(consumeFeedbackRateLimit(key, 1000)).toBe(false);
    expect(consumeFeedbackRateLimit(key, 601001)).toBe(true);
  });

  it("validates feedback submission and status inputs", () => {
    expect(feedbackSubmitInput.safeParse({ category: "bug", message: "有一個問題" }).success).toBe(true);
    expect(feedbackSubmitInput.safeParse({ category: "bug", message: "短" }).success).toBe(false);
    expect(feedbackSubmitInput.safeParse({ category: "invalid", message: "這是一段足夠長的內容" }).success).toBe(false);
    expect(feedbackStatusInput.safeParse({ id: 1, status: "reviewing" }).success).toBe(true);
    expect(feedbackStatusInput.safeParse({ id: 0, status: "resolved" }).success).toBe(false);
  });

  it("builds notification content with safe fallbacks", () => {
    expect(buildFeedbackNotificationContent({ message: "希望增加風格選擇" })).toContain("來源頁面：未提供");
    expect(buildFeedbackNotificationContent({ message: "有錯誤", page: "/", contact: "a@example.com" })).toContain("聯絡方式：a@example.com");
  });

  it("rejects unauthenticated access to the owner inbox", async () => {
    const caller = appRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });
    await expect(caller.feedback.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps a saved result when owner notification is unavailable", () => {
    const item = { id: 7, message: "測試回饋" };
    expect(buildFeedbackSubmissionResult(item, false)).toEqual({ item, notified: false });
  });
});
