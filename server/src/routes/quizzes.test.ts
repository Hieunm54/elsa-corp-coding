import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app";

const mockEmit = vi.fn();
const mockTo = vi.fn(() => ({ emit: mockEmit }));

vi.mock("../socket", () => ({ getIo: () => ({ to: mockTo }) }));

vi.mock("../services/quiz", () => ({
  joinQuiz: vi.fn(async (quizId: string) => {
    if (quizId !== "quiz-001") throw new Error("Quiz not found");
    return { token: "tok-abc", participantId: "pid-123" };
  }),
  startQuiz: vi.fn(async (quizId: string) => {
    if (quizId !== "quiz-001") throw new Error("Quiz not found");
    return { id: "q1", text: "Q?", options: ["A", "B"], timeLimitSec: 30, questionNumber: 1, totalQuestions: 5 };
  }),
  nextQuestion: vi.fn(async (quizId: string) => {
    if (quizId !== "quiz-001") throw new Error("Quiz not found");
    return { id: "q2", text: "Q2?", options: ["A", "B"], timeLimitSec: 30, questionNumber: 2, totalQuestions: 5 };
  }),
}));

describe("GET /quizzes/:quizId", () => {
  it("returns quiz metadata for a valid id", async () => {
    const res = await request(app).get("/quizzes/quiz-001");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: "quiz-001",
      title: "English Vocabulary - Level 1",
      status: "active",
      questionCount: 5,
    });
  });

  it("does not expose questions or correct answers", async () => {
    const res = await request(app).get("/quizzes/quiz-001");
    expect(res.body).not.toHaveProperty("questions");
    expect(res.body).not.toHaveProperty("correctAnswer");
  });

  it("returns 404 for an unknown quiz id", async () => {
    const res = await request(app).get("/quizzes/quiz-999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("POST /quizzes/:quizId/join", () => {
  it("returns 201 with token and participantId", async () => {
    const res = await request(app)
      .post("/quizzes/quiz-001/join")
      .send({ username: "alice" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ token: "tok-abc", participantId: "pid-123" });
  });

  it("returns 400 when username is missing", async () => {
    const res = await request(app).post("/quizzes/quiz-001/join").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when username is blank", async () => {
    const res = await request(app).post("/quizzes/quiz-001/join").send({ username: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 404 when quiz does not exist", async () => {
    const res = await request(app)
      .post("/quizzes/quiz-999/join")
      .send({ username: "alice" });
    expect(res.status).toBe(404);
  });
});

describe("POST /quizzes/:quizId/start", () => {
  it("returns 200 with first question and broadcasts to room", async () => {
    const res = await request(app).post("/quizzes/quiz-001/start");
    expect(res.status).toBe(200);
    expect(res.body.started).toBe(true);
    expect(res.body.question.questionNumber).toBe(1);
    expect(mockTo).toHaveBeenCalledWith("quizzes:quiz-001");
    expect(mockEmit).toHaveBeenCalledWith("question", expect.objectContaining({ id: "q1" }));
  });

  it("returns 404 for unknown quiz", async () => {
    const res = await request(app).post("/quizzes/quiz-999/start");
    expect(res.status).toBe(404);
  });
});

describe("POST /quizzes/:quizId/next-question", () => {
  it("returns 200 with next question and broadcasts to room", async () => {
    const res = await request(app).post("/quizzes/quiz-001/next-question");
    expect(res.status).toBe(200);
    expect(res.body.question.questionNumber).toBe(2);
    expect(mockEmit).toHaveBeenCalledWith("question", expect.objectContaining({ id: "q2" }));
  });

  it("returns 404 for unknown quiz", async () => {
    const res = await request(app).post("/quizzes/quiz-999/next-question");
    expect(res.status).toBe(404);
  });
});
