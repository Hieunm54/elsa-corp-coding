# System Design: Real-Time Vocabulary Quiz

## 1. Architecture

### Single-Node (Functional Baseline)

```
┌──────────────────────────┐          ┌──────────────────────────────────────────────┐
│   React Client (TS)      │          │        Node.js + Express Server (TS)         │
│                          │          │                                              │
│  ┌──────────────────┐    │◄──WS────►│  ┌──────────────┐   ┌──────────────────┐    │
│  │  Join Page       │    │          │  │  Socket.IO   │   │   REST API       │    │
│  │  Quiz Play Page  │◄───┼──REST───►│  │  Handler     │   │  /quizzes/:id/  │    │
│  │  Leaderboard     │    │          │  └──────┬───────┘   └────────┬─────────┘    │
│  └──────────────────┘    │          │         │                    │              │
└──────────────────────────┘          │         ▼                    ▼              │
                                      │  ┌──────────────────────────────────────┐   │
                                      │  │              Redis                   │   │
                                      │  │  Sorted Set  → leaderboard ranking   │   │
                                      │  │  Hash        → session / quiz state  │   │
                                      │  │  Set         → answered tracking     │   │
                                      │  │  String      → question timestamps   │   │
                                      │  └──────────────────────────────────────┘   │
                                      │         │                                   │
                                      │         ▼                                   │
                                      │  ┌──────────────┐                          │
                                      │  │              │                          │
                                      │  │  quiz data   │                          │
                                      │  │  questions   │                          │
                                      │  └──────────────┘                          │
                                      └──────────────────────────────────────────────┘
```

### Multi-Node (Horizontal Scale)

```
              ┌─────────────────┐
              │  Load Balancer  │
              └────────┬────────┘
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Node 1    Node 2    Node 3
             └────────┬─────────┘
                      ▼
          ┌───────────────────────┐
          │  Redis               │
          │  - Data store        │
          │  - Socket.IO Adapter │  ← broadcasts events across all nodes
          │  - Pub/Sub           │
          └───────────┬───────────┘
                      ▼
               ┌─────────────┐
               │  Mock data  │
               └─────────────┘
```

The **Socket.IO Redis Adapter** is the key enabler: room broadcasts are forwarded via Redis pub/sub, so any node can emit to any room regardless of which node the client is connected to.

---

## 2. Component Descriptions

| Component               | Role                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| **React Client**        | Join quiz, display questions, submit answers, show live leaderboard              |
| **REST API**            | Register participant, return session token, serve quiz metadata                  |
| **Socket.IO Handler**   | Authenticate socket, receive answers, broadcast leaderboard                      |
| **Scoring Service**     | Validate answers, compute time-based points, update Redis                        |
| **Leaderboard Service** | Debounced read from Redis sorted set, broadcast to room                          |
| **Redis**               | Live state store: scores, session tokens, answered tracking, question timestamps |

---

## 3. Data Flow

### Join

```
Client  → POST /quizzes/:quizId/join  { username }
Server  → validate quizId exists in DB ( mock file for now )
        → generate session token
        → SET session:{token} { participantId, quizId, username }  TTL=24h
        → HSET quizzes:{quizId}:participants  participantId username
        ← { token, participantId, quizId }
```

### Connect & Authenticate

```
Client  → WS connect → emit authenticate { token }
Server  → GET session:{token} → validate
        → socket.join("quizzes:{quizId}")
        → emit authenticated { participantId, username }
        → broadcast participant_joined { username, count } to room
```

### Question Broadcast (host triggers / auto-advance)

```
Server  → fetch question from DB ( mock data )
        → SET quizzes:{quizId}:question:{qId}:startedAt  <epoch ms>
        → broadcast question { id, text, options, timeLimit } to room
```

### Answer Submit

```
Client  → emit submit_answer { questionId, answer }
Server  → SISMEMBER quizzes:{quizId}:answered:{qId} participantId
            → reject if already answered
        → GET quizzes:{quizId}:question:{qId}:startedAt
        → timeRemaining = timeLimit - (now - startedAt) / 1000
            → if <= 0: emit answer_result { tooLate: true, pointsEarned: 0 }
        → points = isCorrect ? basePoints + floor(bonusPoints × timeRemaining/timeLimit) : 0
        → SADD quizzes:{quizId}:answered:{qId}  participantId
        → ZINCRBY quizzes:{quizId}:leaderboard  points  participantId
        → emit answer_result { isCorrect, pointsEarned } to submitter
        → mark quiz dirty (trigger debounce)
```

### Leaderboard Broadcast (debounced 500ms)

```
Server  → ZREVRANGE quizzes:{quizId}:leaderboard 0 -1 WITHSCORES
        → HGETALL quizzes:{quizId}:participants  (enrich with usernames)
        → broadcast leaderboard_update [{ rank, username, score }] to room
        → clear dirty flag
```

---

### Redis Keys

```
session:{token}                          Hash    TTL=24h
  → { participantId, quizId, username }

quizzes:{quizId}:state                   Hash
  → { status, currentQuestionIndex, startedAt }

quizzes:{quizId}:participants            Hash
  → { participantId: username, ... }

quizzes:{quizId}:leaderboard             Sorted Set
  → member=participantId, score=totalPoints

quizzes:{quizId}:answered:{questionId}   Set
  → { participantId, ... }

quizzes:{quizId}:question:{qId}:startedAt  String (epoch ms)
```

---

## 5. API & Socket Contract

### REST

```
POST /quizzes/:quizId/join   { username }  → { token, participantId }
GET  /quizzes/:quizId                      → { id, title, status, questionCount }

GET  /health                               → { status: "ok" }
```

### Socket.IO Events

**Client → Server**
| Event | Payload |
|-------|---------|
| `authenticate` | `{ token }` |
| `submit_answer` | `{ questionId, answer }` |

**Server → Client**
| Event | Payload |
|-------|---------|
| `authenticated` | `{ participantId, username }` |
| `participant_joined` | `{ username, count }` |
| `question` | `{ id, text, options, timeLimit }` |
| `answer_result` | `{ isCorrect, pointsEarned, totalScore, tooLate? }` |
| `leaderboard_update` | `[{ rank, username, score }]` |
| `quiz_ended` | `{ finalLeaderboard }` |

---

## 6. Scoring Model

```
points = isCorrect
  ? basePoints + floor(bonusPoints × (timeRemaining / timeLimit))
  : 0

Example (timeLimit=30s, basePoints=100, bonusPoints=50):
  answer at 5s  elapsed → timeRemaining=25s → 100 + floor(50 × 25/30) = 141 pts
  answer at 20s elapsed → timeRemaining=10s → 100 + floor(50 × 10/30) = 116 pts
  answer at 30s elapsed → timeRemaining=0s  → 100 pts (base only)
  answer after timeout  → 0 pts, rejected
```

---

## 7. Technologies & Justification

| Layer         | Choice               | Reason                                                        |
| ------------- | -------------------- | ------------------------------------------------------------- |
| Runtime       | Node.js + TypeScript | Async I/O fits WebSocket workload; TS adds type safety        |
| Framework     | Express              | Minimal, well-understood, easy to extend                      |
| Real-time     | Socket.IO            | Room management, auto-reconnect, Redis adapter for multi-node |
| Leaderboard   | Redis Sorted Set     | `ZINCRBY` / `ZREVRANGE` are atomic and O(log N)               |
| Session store | Redis Hash + TTL     | Fast reads, automatic expiry                                  |
| Client        | React + TypeScript   | Component model suits real-time UI updates                    |

---

## 8. Non-Functional Requirements

### Scalability

#### Scaling read

This design is based heavily on redis without a real DB. so I will propose scaling read for redis only.

- **Read replicas**: redis supports primary-replica. the leaderboard boardcaster is the highest-frequency read, so we can offload it to a replica to reduce load on the primary
  !!! replica introduce lag, but it is still acceptable with leaderboard

- **Horizontal scaling**: shards across multiple nodes using consistent hashing using with quizz id. Each quiz's data (quizzes:quiz-001:\*) lands on one shard determined by the hash slot of the key prefix. now we can support more concurrent quizzes without draining our redis
- **Redis Sorted Sets** handle concurrent `ZINCRBY` atomically — no race conditions on scoring
- **Trade-off**: Redis becomes a critical dependency; mitigated with Redis Sentinel or Redis Cluster for HA

#### Scaling write

1. **Vertical scaling**: the easiest and most straightforward solution. It can buy time but not a long-term fix due to hardware limitation

2. **Sharding by quiz ID**: each quiz's keys land on one shard based on the key hash. It solves the multiple quizzes competing problem

3. **Burst join pattern**: when a popular quiz is opened, all users join within seconds, we can introduce load balancer to distribute requests

### Performance

- Debounced leaderboard broadcast (500ms) caps broadcast frequency under high answer throughput
- `ZREVRANGE` is O(log N + M) — sub-millisecond for typical leaderboard sizes

### Reliability

- Redis TTLs auto-cleanup orphaned sessions
- Duplicate answer prevention via Redis Set (`SADD` is idempotent)
- **Trade-off**: In-flight answer at crash time may be lost but it is acceptable for quiz context

### Maintainability

- Layered structure: `routes → services → redis/db` — each layer has one concern
- TypeScript interfaces for all socket payloads and Redis value shapes

### Monitoring & Observability

- Structured JSON logging via `pino` (request id, quiz id, participant id on every log line)
- `GET /health` endpoint for load balancer and uptime checks

---

## 9. Project Structure

```
/
├── server/
│   └── src/
│       ├── routes/         (REST handlers)
│       ├── socket/         (Socket.IO event handlers)
│       ├── services/       (scoring, leaderboard, quiz logic)
│       ├── redis/          (client + key helpers)
│       └── seed/           (mock quiz data)
└── client/
    └── src/
        ├── pages/          (Join, Play)
        ├── components/     (Leaderboard, Question, Timer)
        └── hooks/          (useSocket, useLeaderboard, useTimer)
```
