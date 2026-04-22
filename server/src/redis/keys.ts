export const keys = {
  session: (token: string) => `session:${token}`,
  quizState: (quizId: string) => `quizzes:${quizId}:state`,
  participants: (quizId: string) => `quizzes:${quizId}:participants`,
  leaderboard: (quizId: string) => `quizzes:${quizId}:leaderboard`,
  answered: (quizId: string, questionId: string) => `quizzes:${quizId}:answered:${questionId}`,
  questionStartedAt: (quizId: string, questionId: string) => `quizzes:${quizId}:question:${questionId}:startedAt`,
};
