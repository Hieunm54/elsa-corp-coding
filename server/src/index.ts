import http from "http";
import app from "./app";
import { config } from "./config";
import { logger } from "./logger";
import redis from "./redis/client";
import { setupSocket } from "./socket";

async function start() {
  await redis.connect();

  const httpServer = http.createServer(app);
  setupSocket(httpServer);

  httpServer.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "Server started");
  });

  const shutdown = () => {
    logger.info("Shutting down...");
    httpServer.close(async () => {
      await redis.quit();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
