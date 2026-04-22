import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../logger";

const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis error"));

export default redis;
