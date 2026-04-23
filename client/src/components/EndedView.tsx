import type { LeaderboardEntry } from '../types'

const RANK_EMOJI = ['🥇', '🥈', '🥉']

interface Props {
  leaderboard: LeaderboardEntry[]
  username: string
  onPlayAgain: () => void
}

export default function EndedView({ leaderboard, username, onPlayAgain }: Props) {
  const myEntry = leaderboard.find((e) => e.username === username)

  return (
    <div className="full-page">
      <div className="ended-page">
        <div className="ended-header">
          <div className="ended-trophy">🏆</div>
          <h1>Quiz Complete!</h1>
          {myEntry && (
            <p className="text-muted text-sm" style={{ marginTop: 8 }}>
              You finished{' '}
              <strong style={{ color: 'var(--text)' }}>#{myEntry.rank}</strong> with{' '}
              <strong style={{ color: 'var(--accent-hover)' }}>{myEntry.score} pts</strong>
            </p>
          )}
        </div>

        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={onPlayAgain}>
          Join Another Quiz
        </button>

        <div className="final-lb">
          <div className="final-lb-header">
            <h3>Final Standings</h3>
          </div>
          <ul className="final-lb-list">
            {leaderboard.map((e) => (
              <li
                key={e.rank}
                className={`final-lb-item${e.username === username ? ' me' : ''}`}
              >
                <span className="final-rank">
                  {e.rank <= 3 ? RANK_EMOJI[e.rank - 1] : `${e.rank}.`}
                </span>
                <span className="final-name">{e.username}</span>
                {e.username === username && <span className="you-tag">you</span>}
                <span className="final-score">{e.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
