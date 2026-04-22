import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../redis/client", () => ({
  default: {
    set: vi.fn().mockResolvedValue("OK"),
    hset: vi.fn().mockResolvedValue(1),
  },
}));

import { joinQuiz } from "./quiz";

describe("joinQuiz", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns token and participantId for a valid quiz", async () => {
    const result = await joinQuiz("quiz-001", "alice");
    expect(result.token).toBeTruthy();
    expect(result.participantId).toBeTruthy();
    expect(result.token).not.toBe(result.participantId);
  });

  it("throws when quiz is not found", async () => {
    await expect(joinQuiz("quiz-999", "alice")).rejects.toThrow("Quiz not found");
  });

  it("throws when quiz is not active", async () => {
    const { quizzes } = await import("../seed/quizzes");
    const original = quizzes[0].status;
    quizzes[0].status = "completed";
    await expect(joinQuiz("quiz-001", "alice")).rejects.toThrow("Quiz is not active");
    quizzes[0].status = original;
  });
});
