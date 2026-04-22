import { describe, it, expect } from "vitest";
import { keys } from "./keys";

describe("Redis key builders", () => {
  it("session", () => expect(keys.session("tok123")).toBe("session:tok123"));
  it("quizState", () => expect(keys.quizState("quiz-001")).toBe("quizzes:quiz-001:state"));
  it("participants", () => expect(keys.participants("quiz-001")).toBe("quizzes:quiz-001:participants"));
  it("leaderboard", () => expect(keys.leaderboard("quiz-001")).toBe("quizzes:quiz-001:leaderboard"));
  it("answered", () => expect(keys.answered("quiz-001", "q1")).toBe("quizzes:quiz-001:answered:q1"));
  it("questionStartedAt", () =>
    expect(keys.questionStartedAt("quiz-001", "q1")).toBe("quizzes:quiz-001:question:q1:startedAt"));
});
