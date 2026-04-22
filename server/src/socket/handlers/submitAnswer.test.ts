import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../redis/client", () => ({
  default: {
    sismember: vi.fn(),
    get: vi.fn(),
    sadd: vi.fn().mockResolvedValue(1),
    zincrby: vi.fn().mockResolvedValue("141"),
    zadd: vi.fn().mockResolvedValue(1),
    zscore: vi.fn().mockResolvedValue("141"),
  },
}));

import redis from "../../redis/client";
import { registerSubmitAnswerHandler } from "./submitAnswer";

const QUIZ_ID = "quiz-001";
const QUESTION_ID = "q1";
const PARTICIPANT_ID = "pid-1";
const CORRECT_ANSWER = "Short-lived";

function makeSocket(authenticated = true) {
  const socket: any = {
    data: authenticated
      ? { participantId: PARTICIPANT_ID, quizId: QUIZ_ID, username: "alice" }
      : {},
    emit: vi.fn(),
    on: vi.fn(),
  };
  return socket;
}

function makeIo() {
  return {} as any;
}

async function triggerSubmit(socket: any, payload: unknown) {
  registerSubmitAnswerHandler(makeIo(), socket);
  const handler = socket.on.mock.calls.find(([e]: [string]) => e === "submit_answer")?.[1];
  await handler(payload);
}

describe("submit_answer handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits answer_result with points on correct answer", async () => {
    vi.mocked(redis.sismember).mockResolvedValue(0);
    vi.mocked(redis.get).mockResolvedValue(String(Date.now() - 5000)); // 5s elapsed

    const socket = makeSocket();
    await triggerSubmit(socket, { questionId: QUESTION_ID, answer: CORRECT_ANSWER });

    const [event, result] = socket.emit.mock.calls[0];
    expect(event).toBe("answer_result");
    expect(result.isCorrect).toBe(true);
    expect(result.pointsEarned).toBeGreaterThan(100); // base + time bonus
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it("emits answer_result with 0 points on wrong answer", async () => {
    vi.mocked(redis.sismember).mockResolvedValue(0);
    vi.mocked(redis.get).mockResolvedValue(String(Date.now() - 5000));
    vi.mocked(redis.zscore).mockResolvedValue("0");

    const socket = makeSocket();
    await triggerSubmit(socket, { questionId: QUESTION_ID, answer: "Wrong" });

    const [event, result] = socket.emit.mock.calls[0];
    expect(event).toBe("answer_result");
    expect(result.isCorrect).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });

  it("rejects duplicate answer", async () => {
    vi.mocked(redis.sismember).mockResolvedValue(1);

    const socket = makeSocket();
    await triggerSubmit(socket, { questionId: QUESTION_ID, answer: CORRECT_ANSWER });

    expect(socket.emit).toHaveBeenCalledWith(
      "answer_result",
      expect.objectContaining({ alreadyAnswered: true })
    );
  });

  it("rejects late answer when time expired", async () => {
    vi.mocked(redis.sismember).mockResolvedValue(0);
    vi.mocked(redis.get).mockResolvedValue(String(Date.now() - 60_000)); // 60s ago

    const socket = makeSocket();
    await triggerSubmit(socket, { questionId: QUESTION_ID, answer: CORRECT_ANSWER });

    expect(socket.emit).toHaveBeenCalledWith(
      "answer_result",
      expect.objectContaining({ tooLate: true })
    );
  });

  it("emits error when question is not active", async () => {
    vi.mocked(redis.sismember).mockResolvedValue(0);
    vi.mocked(redis.get).mockResolvedValue(null);

    const socket = makeSocket();
    await triggerSubmit(socket, { questionId: QUESTION_ID, answer: CORRECT_ANSWER });

    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: "Question is not active" }));
  });

  it("emits error when not authenticated", async () => {
    const socket = makeSocket(false);
    await triggerSubmit(socket, { questionId: QUESTION_ID, answer: CORRECT_ANSWER });

    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: "Not authenticated" }));
  });

  it("emits error when payload is incomplete", async () => {
    const socket = makeSocket();
    await triggerSubmit(socket, { questionId: QUESTION_ID });

    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.any(String) }));
  });
});
