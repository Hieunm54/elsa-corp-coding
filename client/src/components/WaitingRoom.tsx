interface Props {
  title: string
  username: string
  count: number
}

export default function WaitingRoom({ title, username, count }: Props) {
  return (
    <div className="full-page">
      <div className="waiting-card card">
        <div className="waiting-icon">⏳</div>
        <h2>{title}</h2>
        <p className="text-muted text-sm" style={{ marginTop: 8 }}>
          Waiting for the quiz to start...
        </p>

        <div className="participant-badge">
          <span className="live-dot" />
          <span>
            {count} participant{count !== 1 ? 's' : ''} joined
          </span>
        </div>

        <p className="text-sm text-muted" style={{ marginTop: 20 }}>
          You joined as <strong style={{ color: 'var(--text)' }}>{username}</strong>
        </p>
      </div>
    </div>
  )
}
