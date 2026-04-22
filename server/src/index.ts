import http from "http";
import app from "./app";
import { config } from "./config";
import { logger } from "./logger";
import redis from "./redis/client";
import { setupSocket } from "./socket";
import { startLeaderboardBroadcaster, stopLeaderboardBroadcaster } from "./services/leaderboard";

async function start() {
  await redis.connect();

  const httpServer = http.createServer(app);
  const io = setupSocket(httpServer);
  startLeaderboardBroadcaster(io);

  httpServer.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "Server started");
  });

  const shutdown = () => {
    logger.info("Shutting down...");
    stopLeaderboardBroadcaster();
    httpServer.close(async () => {
      await redis.quit();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
