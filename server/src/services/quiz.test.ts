import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../redis/client", () => ({
  default: {
    set: vi.fn().mockResolvedValue("OK"),
    hset: vi.fn().mockResolvedValue(1),
    hget: vi.fn(),
  },
}));

import redis from "../redis/client";
import { joinQuiz, startQuiz, nextQuestion } from "./quiz";


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

describe("startQuiz", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns first question payload", async () => {
    const result = await startQuiz("quiz-001");
    expect(result.questionNumber).toBe(1);
    expect(result.totalQuestions).toBe(5);
    expect(result.id).toBe("q1");
    expect(result).not.toHaveProperty("correctAnswer");
  });

  it("writes questionStartedAt and state to Redis", async () => {
    await startQuiz("quiz-001");
    expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
      expect.stringContaining("q1:startedAt"),
      expect.any(String)
    );
    expect(vi.mocked(redis.hset)).toHaveBeenCalledWith(
      expect.stringContaining("state"),
      "currentQuestionIndex",
      "0"
    );
  });

  it("throws for unknown quiz", async () => {
    await expect(startQuiz("quiz-999")).rejects.toThrow("Quiz not found");
  });
});

describe("nextQuestion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns next question payload", async () => {
    vi.mocked(redis.hget).mockResolvedValue("0");
    const result = await nextQuestion("quiz-001");
    expect(result.questionNumber).toBe(2);
    expect(result.id).toBe("q2");
  });

  it("throws when quiz not started", async () => {
    vi.mocked(redis.hget).mockResolvedValue(null);
    await expect(nextQuestion("quiz-001")).rejects.toThrow("Quiz not started");
  });

  it("throws when no more questions", async () => {
    vi.mocked(redis.hget).mockResolvedValue("4"); // last question index
    await expect(nextQuestion("quiz-001")).rejects.toThrow("No more questions");
  });
});
