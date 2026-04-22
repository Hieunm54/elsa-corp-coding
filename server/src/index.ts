import app from "./app";
import { config } from "./config";
import { logger } from "./logger";
import redis from "./redis/client";

async function start() {
  await redis.connect();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "Server started");
  });

  const shutdown = () => {
    logger.info("Shutting down...");
    server.close(async () => {
      await redis.quit();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
