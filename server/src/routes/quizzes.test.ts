import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

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
