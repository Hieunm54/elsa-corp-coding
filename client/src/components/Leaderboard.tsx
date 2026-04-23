import type { LeaderboardEntry } from '../types'

const RANK_EMOJI = ['🥇', '🥈', '🥉']

interface Props {
  entries: LeaderboardEntry[]
  username: string
}

export default function Leaderboard({ entries, username }: Props) {
  return (
    <div className="lb-card">
      <div className="lb-title">Leaderboard</div>
      {entries.length === 0 ? (
        <div className="lb-empty">No scores yet</div>
      ) : (
        <ul className="lb-list">
          {entries.map((e) => (
            <li key={e.rank} className={`lb-item${e.username === username ? ' me' : ''}`}>
              <span className="lb-rank">
                {e.rank <= 3 ? RANK_EMOJI[e.rank - 1] : `${e.rank}.`}
              </span>
              <span className="lb-name">{e.username}</span>
              {e.username === username && <span className="you-tag">you</span>}
              <span className="lb-score">{e.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
