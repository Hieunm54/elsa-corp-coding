import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app";

vi.mock("../services/quiz", () => ({
  joinQuiz: vi.fn(async (quizId: string) => {
    if (quizId !== "quiz-001") throw new Error("Quiz not found");
    return { token: "tok-abc", participantId: "pid-123" };
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
