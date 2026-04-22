import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/quiz_db",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
