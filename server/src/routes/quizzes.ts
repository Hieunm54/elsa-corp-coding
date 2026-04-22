import { Router, Request, Response } from "express";
import { findQuiz } from "../seed/quizzes";

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

export default router;
