import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFeedback: vi.fn(),
  consumeFeedbackRateLimit: vi.fn(),
  notifyOwner: vi.fn(),
  listFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
  listPublicFeedback: vi.fn(),
  updateFeedbackVisibility: vi.fn(),
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
    mocks.listPublicFeedback.mockResolvedValue([{ id: 1, category: "suggestion", message: "公開建議", createdAt: new Date(1) }]);
    mocks.updateFeedbackVisibility.mockImplementation(async (id: number, isPublic: boolean) => ({ id, isPublic }));
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

  it("publicList returns only the public projection", async () => {
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });
    await expect(caller.publicList()).resolves.toEqual([{ id: 1, category: "suggestion", message: "公開建議", createdAt: new Date(1) }]);
    expect(mocks.listPublicFeedback).toHaveBeenCalledOnce();
  });

  it("re-fetches public data after an admin hides a feedback item", async () => {
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: { id: 1, role: "admin" } as never });
    await caller.updateVisibility({ id: 1, isPublic: false });
    mocks.listPublicFeedback.mockResolvedValueOnce([]);
    await expect(feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null }).publicList()).resolves.toEqual([]);
    expect(mocks.updateFeedbackVisibility).toHaveBeenCalledWith(1, false);
  });

  it("does not persist when the rate limit blocks the request", async () => {
    mocks.consumeFeedbackRateLimit.mockReturnValue(false);
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });

    await expect(caller.submit({ category: "bug", message: "這裡有一個錯誤" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.createFeedback).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });
});
