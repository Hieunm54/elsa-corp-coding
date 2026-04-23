import { v4 as uuidv4 } from "uuid";
import redis from "../redis/client";
import { keys } from "../redis/keys";
import { findQuiz } from "../seed/quizzes";
import { getLeaderboardEntries } from "./leaderboard";

const SESSION_TTL_SEC = 60 * 60 * 24; // 24h

export async function joinQuiz(quizId: string, username: string) {
  const quiz = findQuiz(quizId);
  if (!quiz) throw new Error("Quiz not found");
  if (quiz.status !== "active") throw new Error("Quiz is not active");

  const participantId = uuidv4();
  const token = uuidv4();

  await redis.set(
    keys.session(token),
    JSON.stringify({ participantId, quizId, username }),
    "EX",
    SESSION_TTL_SEC,
  );
  await redis.hset(keys.participants(quizId), participantId, username);

  return { token, participantId };
}

export async function startQuiz(quizId: string) {
  const quiz = findQuiz(quizId);
  if (!quiz) throw new Error("Quiz not found");
  if (quiz.status !== "active") throw new Error("Quiz is not active");

  return { status: "question" as const, payload: await setQuestion(quizId, 0) };
}

type NextQuestionResult =
  | { status: "question"; payload: Awaited<ReturnType<typeof setQuestion>> }
  | {
      status: "ended";
      finalLeaderboard: Awaited<ReturnType<typeof getLeaderboardEntries>>;
    }
  | { status: "already_advanced" };

export async function nextQuestion(
  quizId: string,
  fromQuestionId: string,
): Promise<NextQuestionResult> {
  const quiz = findQuiz(quizId);
  if (!quiz) throw new Error("Quiz not found");

  const raw = await redis.hget(keys.quizState(quizId), "currentQuestionIndex");
  if (raw === null) throw new Error("Quiz not started");

  const currentIndex = parseInt(raw, 10);

  // prevent advancing if the current question does not match fromQuestionId
  if (currentIndex < 0 || quiz.questions[currentIndex]?.id !== fromQuestionId) {
    return { status: "already_advanced" };
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex >= quiz.questions.length) {
    await redis.hset(keys.quizState(quizId), "currentQuestionIndex", "-1");
    const finalLeaderboard = await getLeaderboardEntries(quizId);
    return { status: "ended", finalLeaderboard };
  }

  return { status: "question", payload: await setQuestion(quizId, nextIndex) };
}

async function setQuestion(quizId: string, index: number) {
  const quiz = findQuiz(quizId)!;
  const question = quiz.questions[index];

  await Promise.all([
    redis.hset(keys.quizState(quizId), "currentQuestionIndex", String(index)),
    redis.set(keys.questionStartedAt(quizId, question.id), String(Date.now())),
  ]);

  return {
    id: question.id,
    text: question.text,
    options: question.options,
    timeLimitSec: question.timeLimitSec,
    questionNumber: index + 1,
    totalQuestions: quiz.questions.length,
  };
}
