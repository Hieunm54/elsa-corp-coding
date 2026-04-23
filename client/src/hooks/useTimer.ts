import { useState, useEffect } from 'react'

export function useTimer(duration: number, resetKey: unknown): number {
  const [remaining, setRemaining] = useState(duration)

  useEffect(() => {
    setRemaining(duration)
    if (duration <= 0) return

    const start = Date.now()
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const r = Math.max(0, duration - elapsed)
      setRemaining(r)
      if (r <= 0) clearInterval(id)
    }, 100)

    return () => clearInterval(id)
  }, [duration, resetKey])

  return remaining
}
