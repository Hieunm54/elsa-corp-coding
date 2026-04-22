import { v4 as uuidv4 } from "uuid";
import redis from "../redis/client";
import { keys } from "../redis/keys";
import { findQuiz } from "../seed/quizzes";

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
    SESSION_TTL_SEC
  );
  await redis.hset(keys.participants(quizId), participantId, username);

  return { token, participantId };
}
