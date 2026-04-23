export type Screen = 'join' | 'waiting' | 'playing' | 'ended';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  timeLimitSec: number;
  questionNumber: number;
  totalQuestions: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  tooLate?: boolean;
}
