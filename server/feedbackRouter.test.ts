import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFeedback: vi.fn(),
  consumeFeedbackRateLimit: vi.fn(),
  notifyOwner: vi.fn(),
  listFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
  listPublicFeedback: vi.fn(),
  updateFeedbackVisibility: vi.fn(),
  addFeedbackVote: vi.fn(),
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
    mocks.addFeedbackVote.mockResolvedValue({ added: true });
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

  it("forwards popular sorting to the public list service", async () => {
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });
    await caller.publicList({ sort: "popular" });
    expect(mocks.listPublicFeedback).toHaveBeenCalledWith("popular");
  });

  it("routes +1 votes through a stable anonymous voter key", async () => {
    const caller = feedbackRouter.createCaller({ req: { headers: { "x-forwarded-for": "203.0.113.10" }, ip: "127.0.0.1" } as never, res: {} as never, user: null });
    await expect(caller.vote({ id: 1 })).resolves.toEqual({ added: true });
    const [feedbackId, voterKey] = mocks.addFeedbackVote.mock.calls[0];
    expect(feedbackId).toBe(1);
    expect(voterKey).toMatch(/^ip:[a-f0-9]{64}$/);
  });

  it("returns added=false when the same voter has already voted", async () => {
    mocks.addFeedbackVote.mockResolvedValue({ added: false });
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });
    await expect(caller.vote({ id: 1, voterToken: "stable-voter-token-123" })).resolves.toEqual({ added: false });
  });

  it("does not persist when the rate limit blocks the request", async () => {
    mocks.consumeFeedbackRateLimit.mockReturnValue(false);
    const caller = feedbackRouter.createCaller({ req: { headers: {}, ip: "127.0.0.1" } as never, res: {} as never, user: null });

    await expect(caller.submit({ category: "bug", message: "這裡有一個錯誤" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.createFeedback).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });
});
