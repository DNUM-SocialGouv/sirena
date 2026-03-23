import {Redis} from "ioredis";

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD || "",
  maxRetriesPerRequest: null,
});

export const QUEUE_NAME = process.env.REDIS_MIGRATION_QUEUE_NAME || "sirec-id-to-migrate";
export const JOB_CONCURRENCY = 20;
