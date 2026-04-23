import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import JoinPage from './components/JoinPage'
import WaitingRoom from './components/WaitingRoom'
import PlayView from './components/PlayView'
import EndedView from './components/EndedView'
import type { Screen, Question, AnswerResult, LeaderboardEntry } from './types'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

export default function App() {
  const [screen, setScreen] = useState<Screen>('join')
  const [quizTitle, setQuizTitle] = useState('')
  const [username, setUsername] = useState('')
  const [participantCount, setParticipantCount] = useState(1)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myScore, setMyScore] = useState(0)
  const [joinError, setJoinError] = useState('')

  const socketRef = useRef<Socket | null>(null)

  const connectSocket = useCallback((token: string) => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('authenticate', { token })
    })

    socket.on('authenticated', () => {
      setScreen('waiting')
    })

    socket.on('participant_joined', ({ count }: { username: string; count: number }) => {
      setParticipantCount(count)
    })

    socket.on('question', (q: Question) => {
      setCurrentQuestion(q)
      setAnswerResult(null)
      setSelectedAnswer(null)
      setScreen('playing')
    })

    socket.on('answer_result', (result: AnswerResult) => {
      setAnswerResult(result)
      setMyScore(result.totalScore)
    })

    socket.on('leaderboard_update', (entries: LeaderboardEntry[]) => {
      setLeaderboard(entries)
    })

    socket.on('quiz_ended', ({ finalLeaderboard }: { finalLeaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(finalLeaderboard)
      setScreen('ended')
    })

    socket.on('connect_error', () => {
      setJoinError('Could not connect to server. Is it running?')
    })
  }, [])

  const handleJoin = useCallback(async (quizId: string, user: string) => {
    setJoinError('')
    try {
      const quizRes = await fetch(`${SERVER_URL}/quizzes/${quizId}`)
      if (!quizRes.ok) {
        const body = await quizRes.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Quiz not found')
      }
      const quiz = await quizRes.json() as { title: string }
      setQuizTitle(quiz.title)

      const joinRes = await fetch(`${SERVER_URL}/quizzes/${quizId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
      })
      if (!joinRes.ok) {
        const body = await joinRes.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to join quiz')
      }
      const { token } = await joinRes.json() as { token: string }
      setUsername(user)
      connectSocket(token)
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }, [connectSocket])

  const handleSubmitAnswer = useCallback((questionId: string, answer: string) => {
    if (!socketRef.current || selectedAnswer !== null) return
    setSelectedAnswer(answer)
    socketRef.current.emit('submit_answer', { questionId, answer })
  }, [selectedAnswer])

  useEffect(() => {
    return () => { socketRef.current?.disconnect() }
  }, [])

  switch (screen) {
    case 'join':
      return <JoinPage onJoin={handleJoin} error={joinError} />
    case 'waiting':
      return <WaitingRoom title={quizTitle} username={username} count={participantCount} />
    case 'playing':
      return (
        <PlayView
          question={currentQuestion!}
          selectedAnswer={selectedAnswer}
          answerResult={answerResult}
          leaderboard={leaderboard}
          myScore={myScore}
          username={username}
          onSubmit={handleSubmitAnswer}
        />
      )
    case 'ended':
      return <EndedView leaderboard={leaderboard} username={username} />
  }
}
