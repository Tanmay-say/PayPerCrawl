import { Redis, type RedisOptions } from "ioredis";
import { env, isUpstashRedis } from "../config/env.js";

function buildRedisOptions(url: string): RedisOptions {
  const useTls = url.startsWith("rediss://");

  return {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 10_000,
    ...(useTls ? { tls: {} } : {}),
  };
}

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis: Redis =
  globalForRedis.redis ?? new Redis(env.REDIS_URL, buildRedisOptions(env.REDIS_URL));

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready") return;
  await redis.connect();
}

export async function pingRedis(): Promise<string> {
  return redis.ping();
}

export function redisProviderLabel(): string {
  return isUpstashRedis() ? "upstash" : "redis";
}
