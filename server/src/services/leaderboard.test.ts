import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../redis/client", () => ({
  default: {
    zrevrange: vi.fn(),
    hgetall: vi.fn(),
  },
}));

import redis from "../redis/client";
import { broadcastLeaderboard, markDirty, startLeaderboardBroadcaster, stopLeaderboardBroadcaster } from "./leaderboard";

function makeIo() {
  const emitFn = vi.fn();
  return { to: vi.fn().mockReturnValue({ emit: emitFn }), _emit: emitFn } as any;
}

describe("broadcastLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits ranked leaderboard with usernames", async () => {
    vi.mocked(redis.zrevrange).mockResolvedValue(["pid-1", "141", "pid-2", "116"]);
    vi.mocked(redis.hgetall).mockResolvedValue({ "pid-1": "alice", "pid-2": "bob" });

    const io = makeIo();
    await broadcastLeaderboard(io, "quiz-001");

    expect(io.to).toHaveBeenCalledWith("quizzes:quiz-001");
    expect(io._emit).toHaveBeenCalledWith("leaderboard_update", [
      { rank: 1, username: "alice", score: 141 },
      { rank: 2, username: "bob", score: 116 },
    ]);
  });

  it("falls back to 'Unknown' when participant not in hash", async () => {
    vi.mocked(redis.zrevrange).mockResolvedValue(["pid-99", "50"]);
    vi.mocked(redis.hgetall).mockResolvedValue({});

    const io = makeIo();
    await broadcastLeaderboard(io, "quiz-001");

    expect(io._emit).toHaveBeenCalledWith("leaderboard_update", [
      { rank: 1, username: "Unknown", score: 50 },
    ]);
  });

  it("emits empty array when no participants", async () => {
    vi.mocked(redis.zrevrange).mockResolvedValue([]);
    vi.mocked(redis.hgetall).mockResolvedValue({});

    const io = makeIo();
    await broadcastLeaderboard(io, "quiz-001");

    expect(io._emit).toHaveBeenCalledWith("leaderboard_update", []);
  });
});

describe("startLeaderboardBroadcaster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("broadcasts dirty quizzes on interval and clears dirty set", async () => {
    vi.mocked(redis.zrevrange).mockResolvedValue([]);
    vi.mocked(redis.hgetall).mockResolvedValue({});

    const io = makeIo();
    markDirty("quiz-001");
    startLeaderboardBroadcaster(io, 500);

    await vi.advanceTimersByTimeAsync(500);

    expect(io.to).toHaveBeenCalledWith("quizzes:quiz-001");

    // Second tick — dirty set cleared, no more broadcasts
    io.to.mockClear();
    await vi.advanceTimersByTimeAsync(500);
    expect(io.to).not.toHaveBeenCalled();

    stopLeaderboardBroadcaster();
    vi.useRealTimers();
  });
});
