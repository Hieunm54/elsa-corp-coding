import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../redis/client", () => ({
  default: {
    set: vi.fn().mockResolvedValue("OK"),
    hset: vi.fn().mockResolvedValue(1),
    hget: vi.fn(),
    zrevrange: vi.fn().mockResolvedValue([]),
    hgetall: vi.fn().mockResolvedValue({}),
    zadd: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("./leaderboard", () => ({
  markDirty: vi.fn(),
  getLeaderboardEntries: vi.fn().mockResolvedValue([]),
}));

import redis from "../redis/client";
import { markDirty } from "./leaderboard";
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
    expect(result.payload.questionNumber).toBe(1);
    expect(result.payload.totalQuestions).toBe(5);
    expect(result.payload.id).toBe("q1");
    expect(result.payload).not.toHaveProperty("correctAnswer");
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

  it("returns next question payload when on the expected question", async () => {
    vi.mocked(redis.hget).mockResolvedValue("0");
    const result = await nextQuestion("quiz-001", "q1");
    expect(result.status).toBe("question");
    if (result.status === "question") {
      expect(result.payload.questionNumber).toBe(2);
      expect(result.payload.id).toBe("q2");
    }
  });

  it("returns already_advanced when fromQuestionId does not match current", async () => {
    vi.mocked(redis.hget).mockResolvedValue("1"); // currently on q2
    const result = await nextQuestion("quiz-001", "q1"); // claiming to be on q1
    expect(result.status).toBe("already_advanced");
  });

  it("returns ended with leaderboard on the last question", async () => {
    vi.mocked(redis.hget).mockResolvedValue("4"); // last index
    const result = await nextQuestion("quiz-001", "q5");
    expect(result.status).toBe("ended");
    if (result.status === "ended") {
      expect(Array.isArray(result.finalLeaderboard)).toBe(true);
    }
  });

  it("throws when quiz not started", async () => {
    vi.mocked(redis.hget).mockResolvedValue(null);
    await expect(nextQuestion("quiz-001", "q1")).rejects.toThrow("Quiz not started");
  });

  it("marks leaderboard dirty and adds unanswered participants with 0", async () => {
    vi.mocked(redis.hget).mockResolvedValue("0");
    vi.mocked(redis.hgetall).mockResolvedValue({ "pid-1": "alice", "pid-2": "bob" });

    await nextQuestion("quiz-001", "q1");

    expect(vi.mocked(redis.zadd)).toHaveBeenCalledWith(
      expect.stringContaining("leaderboard"),
      "NX",
      0,
      "pid-1",
    );
    expect(vi.mocked(redis.zadd)).toHaveBeenCalledWith(
      expect.stringContaining("leaderboard"),
      "NX",
      0,
      "pid-2",
    );
    expect(vi.mocked(markDirty)).toHaveBeenCalledWith("quiz-001");
  });
});
