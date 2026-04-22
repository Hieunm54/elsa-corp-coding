export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  basePoints: number;
  bonusPoints: number;
  timeLimitSec: number;
  orderNum: number;
}

export interface Quiz {
  id: string;
  title: string;
  status: "draft" | "active" | "completed";
  questions: Question[];
}
