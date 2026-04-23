import { useState, FormEvent } from 'react'

interface Props {
  onJoin: (quizId: string, username: string) => Promise<void>
  error: string
}

export default function JoinPage({ onJoin, error }: Props) {
  const [quizId, setQuizId] = useState('quiz-001')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !quizId.trim()) return
    setLoading(true)
    try {
      await onJoin(quizId.trim(), username.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="full-page">
      <div className="join-page">
        <div className="join-header">
          <div className="join-logo">🧠</div>
          <h1>Vocab Quiz</h1>
          <p className="text-muted text-sm">Real-time vocabulary challenge</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="quizId">Quiz ID</label>
              <input
                id="quizId"
                type="text"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                placeholder="e.g. quiz-001"
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Your name</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your display name"
                disabled={loading}
                maxLength={30}
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !username.trim() || !quizId.trim()}
            >
              {loading ? 'Joining...' : 'Join Quiz →'}
            </button>

            {error && <div className="error-msg">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  )
}
