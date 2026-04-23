import { Server } from "socket.io";
import redis from "../redis/client";
import { keys } from "../redis/keys";
import { logger } from "../logger";

const dirtyQuizzes = new Set<string>();
let interval: NodeJS.Timeout | null = null;

export function markDirty(quizId: string) {
  dirtyQuizzes.add(quizId);
}

export async function getLeaderboardEntries(quizId: string) {
  const raw = await redis.zrevrange(keys.leaderboard(quizId), 0, -1, "WITHSCORES");
  const participants = await redis.hgetall(keys.participants(quizId));

  const entries: { rank: number; username: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const participantId = raw[i];
    const score = Math.round(parseFloat(raw[i + 1]));
    entries.push({
      rank: entries.length + 1,
      username: participants?.[participantId] ?? "Unknown",
      score,
    });
  }
  return entries;
}

export async function broadcastLeaderboard(io: Server, quizId: string) {
  const entries = await getLeaderboardEntries(quizId);
  io.to(`quizzes:${quizId}`).emit("leaderboard_update", entries);
  logger.info({ quizId, participantCount: entries.length }, "Leaderboard broadcast");
}

export function startLeaderboardBroadcaster(io: Server, intervalMs = 500) {
  interval = setInterval(async () => {
    if (dirtyQuizzes.size === 0) return;

    const toProcess = [...dirtyQuizzes];
    dirtyQuizzes.clear();

    await Promise.all(toProcess.map((quizId) => broadcastLeaderboard(io, quizId)));
  }, intervalMs);
}

export function stopLeaderboardBroadcaster() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
