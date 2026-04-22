import { Server, Socket } from "socket.io";
import redis from "../../redis/client";
import { keys } from "../../redis/keys";
import { logger } from "../../logger";
import { SocketData } from "../types";
import { findQuiz } from "../../seed/quizzes";

export function registerSubmitAnswerHandler(
  io: Server,
  socket: Socket<any, any, any, SocketData>
) {
  socket.on("submit_answer", async (payload: { questionId?: string; answer?: string }) => {
    const { participantId, quizId } = socket.data;

    if (!participantId) {
      socket.emit("error", { message: "Not authenticated" });
      return;
    }

    const { questionId, answer } = payload ?? {};
    if (!questionId || answer === undefined) {
      socket.emit("error", { message: "questionId and answer are required" });
      return;
    }

    const question = findQuiz(quizId)?.questions.find((q) => q.id === questionId);
    if (!question) {
      socket.emit("error", { message: "Question not found" });
      return;
    }

    const alreadyAnswered = await redis.sismember(keys.answered(quizId, questionId), participantId);
    if (alreadyAnswered) {
      socket.emit("answer_result", { isCorrect: false, pointsEarned: 0, alreadyAnswered: true });
      return;
    }

    const startedAtRaw = await redis.get(keys.questionStartedAt(quizId, questionId));
    if (!startedAtRaw) {
      socket.emit("error", { message: "Question is not active" });
      return;
    }

    const elapsed = (Date.now() - parseInt(startedAtRaw, 10)) / 1000;
    const timeRemaining = question.timeLimitSec - elapsed;

    if (timeRemaining <= 0) {
      socket.emit("answer_result", { isCorrect: false, pointsEarned: 0, tooLate: true });
      return;
    }

    const isCorrect = answer === question.correctAnswer;
    const pointsEarned = isCorrect
      ? question.basePoints + Math.floor(question.bonusPoints * (timeRemaining / question.timeLimitSec))
      : 0;

    await redis.sadd(keys.answered(quizId, questionId), participantId);

    // Ensure participant appears in leaderboard even on wrong answer
    if (pointsEarned > 0) {
      await redis.zincrby(keys.leaderboard(quizId), pointsEarned, participantId);
    } else {
      await redis.zadd(keys.leaderboard(quizId), "NX", 0, participantId);
    }

    const totalScoreRaw = await redis.zscore(keys.leaderboard(quizId), participantId);
    const totalScore = totalScoreRaw ? Math.round(parseFloat(totalScoreRaw)) : 0;

    socket.emit("answer_result", { isCorrect, pointsEarned, totalScore });

    logger.info({ participantId, quizId, questionId, isCorrect, pointsEarned }, "Answer submitted");
  });
}
