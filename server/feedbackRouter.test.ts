import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFeedback: vi.fn(),
  consumeFeedbackRateLimit: vi.fn(),
  notifyOwner: vi.fn(),
  listFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
}));

vi.mock("./feedback", () => mocks);
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

import { feedbackRouter } from "./feedbackRouter";

describe("feedbackRouter.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeFeedbackRateLimit.mockReturnValue(true);
    mocks.createFeedback.mockResolvedValue({ id: 11, message: "希望增加風格選擇" });
    mocks.notifyOwner.mockResolvedValue(false);
  });

  it("returns the saved item even when owner notification is unavailable", async () => {
    const caller = feedbackRouter.createCaller({
      req: { headers: {}, ip: "127.0.0.1" } as never,
      res: {} as never,
      user: null,
    });

    const result = await caller.submit({ category: "feature", message: "希望增加風格選擇", page: "/" });

    expect(mocks.createFeedback).toHaveBeenCalledWith({ category: "feature", message: "希望增加風格選擇", page: "/", userId: undefined });
    expect(mocks.notifyOwner).toHaveBeenCalledOnce();
    expect(result).toEqual({ item: { id: 11, message: "希望增加風格選擇" }, notified: false });
  });

  it("does not persist when the rate limit blocks the request", async () => {
    mocks.consumeFeedbackRateLimit.mockReturnValue(false);
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });

    await expect(caller.submit({ category: "bug", message: "這裡有一個錯誤" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.createFeedback).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });
});
