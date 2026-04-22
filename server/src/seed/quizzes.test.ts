import { describe, it, expect } from "vitest";
import { findQuiz, quizzes } from "./quizzes";

describe("findQuiz", () => {
  it("returns quiz for a valid id", () => {
    const quiz = findQuiz("quiz-001");
    expect(quiz).toBeDefined();
    expect(quiz?.id).toBe("quiz-001");
    expect(quiz?.questions.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown id", () => {
    expect(findQuiz("quiz-999")).toBeUndefined();
  });

  it("every question has required fields", () => {
    quizzes.forEach((quiz) => {
      quiz.questions.forEach((q) => {
        expect(q.id).toBeTruthy();
        expect(q.options).toHaveLength(4);
        expect(q.options).toContain(q.correctAnswer);
        expect(q.basePoints).toBeGreaterThan(0);
        expect(q.timeLimitSec).toBeGreaterThan(0);
      });
    });
  });
});
