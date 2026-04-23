import { Quiz } from "../types";

export const quizzes: Quiz[] = [
  {
    id: "quiz-001",
    title: "English Vocabulary - Level 1",
    status: "active",
    questions: [
      {
        id: "q1",
        text: "What does 'ephemeral' mean?",
        options: ["Permanent", "Short-lived", "Colorful", "Ancient"],
        correctAnswer: "Short-lived",
        basePoints: 100,
        bonusPoints: 50,
        timeLimitSec: 15,
        orderNum: 1,
      },
      {
        id: "q2",
        text: "Which word means 'to make something worse'?",
        options: ["Ameliorate", "Mitigate", "Exacerbate", "Alleviate"],
        correctAnswer: "Exacerbate",
        basePoints: 100,
        bonusPoints: 50,
        timeLimitSec: 15,
        orderNum: 2,
      },
      {
        id: "q3",
        text: "What does 'verbose' mean?",
        options: ["Silent", "Using too many words", "Concise", "Aggressive"],
        correctAnswer: "Using too many words",
        basePoints: 100,
        bonusPoints: 50,
        timeLimitSec: 15,
        orderNum: 3,
      },
      {
        id: "q4",
        text: "Which word means 'widespread' or 'common'?",
        options: ["Scarce", "Rare", "Ubiquitous", "Obscure"],
        correctAnswer: "Ubiquitous",
        basePoints: 100,
        bonusPoints: 50,
        timeLimitSec: 15,
        orderNum: 4,
      },
      {
        id: "q5",
        text: "What does 'benevolent' mean?",
        options: ["Cruel", "Indifferent", "Well-meaning", "Greedy"],
        correctAnswer: "Well-meaning",
        basePoints: 100,
        bonusPoints: 50,
        timeLimitSec: 15,
        orderNum: 5,
      },
    ],
  },
];

export const findQuiz = (id: string): Quiz | undefined =>
  quizzes.find((q) => q.id === id);
