import Leaderboard from './Leaderboard'
import { useTimer } from '../hooks/useTimer'
import type { Question, AnswerResult, LeaderboardEntry } from '../types'

interface Props {
  question: Question
  selectedAnswer: string | null
  answerResult: AnswerResult | null
  leaderboard: LeaderboardEntry[]
  myScore: number
  username: string
  onSubmit: (questionId: string, answer: string) => void
  onTimeExpired: (questionId: string) => void
}

export default function PlayView({
  question,
  selectedAnswer,
  answerResult,
  leaderboard,
  myScore,
  username,
  onSubmit,
  onTimeExpired,
}: Props) {
  const remaining = useTimer(
    question.timeLimitSec,
    question.id,
    () => onTimeExpired(question.id),
  )
  const pct = (remaining / question.timeLimitSec) * 100
  const timerClass = pct < 20 ? 'danger' : pct < 40 ? 'warning' : ''

  const optionClass = (option: string) => {
    if (!selectedAnswer) return ''
    if (option !== selectedAnswer) return 'dimmed'
    if (answerResult?.tooLate) return 'late'
    if (answerResult) return answerResult.isCorrect ? 'correct' : 'incorrect'
    return ''
  }

  const bannerType = answerResult
    ? answerResult.tooLate ? 'late' : answerResult.isCorrect ? 'correct' : 'incorrect'
    : selectedAnswer ? 'pending' : null

  return (
    <div className="play-layout">
      {/* timer bar */}
      <div className="timer-bar-track">
        <div
          className={`timer-bar-fill${timerClass ? ` ${timerClass}` : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* header */}
      <div className="play-header">
        <div className="play-header-left">
          Q{question.questionNumber}/{question.totalQuestions}
        </div>

        <div className="timer-display">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className={`timer-count${timerClass ? ` ${timerClass}` : ''}`}>
            {Math.ceil(remaining)}s
          </span>
        </div>

        <div className="score-badge">
          <span className="score-value">{myScore}</span>
          <span className="score-label">pts</span>
        </div>
      </div>

      {/* body */}
      <div className="play-body">
        <div>
          <p className="question-text">{question.text}</p>

          <div className="options-grid">
            {question.options.map((opt) => (
              <button
                key={opt}
                className={`option-btn${optionClass(opt) ? ` ${optionClass(opt)}` : ''}`}
                onClick={() => onSubmit(question.id, opt)}
                disabled={!!selectedAnswer || remaining <= 0}
              >
                {opt}
              </button>
            ))}
          </div>

          {bannerType && (
            <div className={`answer-banner ${bannerType}`}>
              <span className="banner-label">
                {bannerType === 'correct' && '✓ Correct!'}
                {bannerType === 'incorrect' && '✗ Incorrect'}
                {bannerType === 'late' && '⏰ Too late!'}
                {bannerType === 'pending' && 'Answer submitted…'}
              </span>
              {answerResult && (
                <span className="banner-pts">
                  +{answerResult.pointsEarned} pts · Total:{' '}
                  <strong>{answerResult.totalScore}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        <Leaderboard entries={leaderboard} username={username} />
      </div>
    </div>
  )
}
