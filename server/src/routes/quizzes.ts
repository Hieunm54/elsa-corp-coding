import { Router, Request, Response } from "express";
import { findQuiz } from "../seed/quizzes";
import { joinQuiz, startQuiz, nextQuestion } from "../services/quiz";
import { getIo } from "../socket";

const router = Router();

router.get("/:quizId", (req: Request, res: Response) => {
  const quiz = findQuiz(req.params.quizId);

  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  res.json({
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    questionCount: quiz.questions.length,
  });
});

router.post("/:quizId/join", async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  try {
    const result = await joinQuiz(req.params.quizId, username.trim());
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Quiz not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message === "Quiz is not active") {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:quizId/start", async (req: Request, res: Response) => {
  try {
    const result = await startQuiz(req.params.quizId);
    getIo().to(`quizzes:${req.params.quizId}`).emit("question", result.payload);
    res.json({ question: result.payload });
  } catch (err) {
    if (err instanceof Error && err.message === "Quiz not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message === "Quiz is not active") {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:quizId/next-question", async (req: Request, res: Response) => {
  const { fromQuestionId } = req.body as { fromQuestionId?: string };

  if (!fromQuestionId) {
    res.status(400).json({ error: "fromQuestionId is required" });
    return;
  }

  try {
    const result = await nextQuestion(req.params.quizId, fromQuestionId);
    const io = getIo();
    const room = `quizzes:${req.params.quizId}`;

    if (result.status === "already_advanced") {
      res.json({ status: "already_advanced" });
      return;
    }

    if (result.status === "ended") {
      io.to(room).emit("quiz_ended", { finalLeaderboard: result.finalLeaderboard });
      res.json({ status: "ended" });
      return;
    }

    io.to(room).emit("question", result.payload);
    res.json({ status: "question", question: result.payload });
  } catch (err) {
    if (err instanceof Error && err.message === "Quiz not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message === "Quiz not started") {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
