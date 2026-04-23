# AI Collaboration

**Tool used:** Claude

---

## How AI was used

The collaboration followed a structured, review-gated workflow:

1. Analyzed the README and co-designed the system architecture
2. Built the backend slice-by-slice: one API/feature at a time, waiting for manual review before continuing
3. Act as coding partner to discuss ideas and assumptions
4. Added tests after each slice to verify behavior
5. Frontend UI was generated in parallel using Claude, I was in charged of integrating API

---

## Key areas of AI assistance

### System design (`SYSTEM_DESIGN.md`)

I proposed the overall architecture:

- Express + Socket.IO on a shared HTTP server,
- Redis Sorted Sets for the leaderboard, per-question Redis Sets for deduplication, and the debounced leaderboard broadcaster pattern

I asked Claude to review the design and pushed back on unnecessary complexity — e.g., PostgreSQL was proposed initially, replaced with a typed mock seed file (`server/src/seed/quizzes.ts`) since mock data is good enough for demo

### Redis key schema (`server/src/redis/keys.ts`)

Claude designed the key namespacing.
I reviewed each key against its access pattern to confirm the right data structure was chosen

### Scoring and deduplication (`server/src/socket/handlers/submitAnswer.ts`)

Asked Claude to propose several approaches to calculate score, received 2 approaches:

- Static point on correct answer
- Time-based scoring (prefer)

  I decide to go with time-based scoring and ask Claude to generate scoring formula.
  I verified the atomicity argument: since a participant has one socket, duplicate submissions arrive sequentially, so `SISMEMBER` + `SADD` without a Lua script is safe to avoid one can submit answer to the same question many time to increase score

### Leaderboard broadcaster (`server/src/services/leaderboard.ts`)

Claude proposed immediately trigger the boardcast to update the leaderboard on every user submission, which can harm our system.

I suggest we should batch them using the dirty-flag pattern: `markDirty(quizId)` adds to a Set. This batches score updates at 500ms instead of broadcasting on every `submit_answer`.
So if 10 users submit answers within the same 500ms window, the leaderboard is only broadcast once for that batch, not 10 times

### Question advance guard (`server/src/services/quiz.ts` — `nextQuestion`)

Claude initially implemented auto-advance via server-side `setTimeout`

During FE integration I replaced this with client-driven advance (the client's timer calls `POST /next-question` when the time's up), which eliminated orphaned timers when the host manually advanced. Claude then proposed the `fromQuestionId` guard to prevent double-advance from concurrent client calls
I validated this against the race scenario: the first caller's `fromQuestionId` matches, advances the index; all subsequent callers see a mismatch and get `already_advanced`

### Test suite (`server/src/**/*.test.ts`)

Claude wrote all unit and integration tests. Two bugs surfaced during this process:

- **`quiz_ended` timer test** — the test was calling `vi.advanceTimersByTimeAsync` without first calling `startQuiz`, so no timer was ever scheduled. Fixed by restructuring the test: call `startQuiz` first, chain `mockResolvedValueOnce` for each `hget` call in sequence, then advance timers in a loop

- **Missing `markDirty` and `ZADD NX 0` in `nextQuestion`** — after refactoring auto-advance to be client-driven, the `handleQuestionTimeout` function (which had contained `ZADD NX 0` for unanswered participants and `markDirty`) was removed

I identified that unanswered participants would no longer appear in the leaderboard and the leaderboard broadcast wouldn't fire on question transitions. Claude added both back into `nextQuestion` and added a test to verify (`zadd` called with `NX` flag for each participant, `markDirty` called with the quiz ID)

---

## Verification process

- **Unit tests after every slice** — `npm test` was run after slice
- **Type checking**
- **Manual review of every generated file** — no file was committed without reading through it
- **Manual Testing** — Manually test every flow myself before commit code
