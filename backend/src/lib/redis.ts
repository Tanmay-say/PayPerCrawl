import { Redis, type RedisOptions } from "ioredis";
import { env } from "../config/env.js";

function isUpstashRedis(): boolean {
  return env.REDIS_URL?.startsWith("rediss://") ?? false;
}

function buildRedisOptions(url: string): RedisOptions {
  const useTls = url.startsWith("rediss://");
  return {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 5_000,
    retryStrategy: () => null, // do not auto-reconnect after an initial failure
    reconnectOnError: () => false,
    ...(useTls ? { tls: {} } : {}),
  };
}

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function makeRedis(): Redis | undefined {
  if (!env.REDIS_URL) return undefined;
  const client = new Redis(env.REDIS_URL, buildRedisOptions(env.REDIS_URL));
  // Swallow background errors so a bad URL doesn't spam stderr.
  client.on("error", () => {
    /* logged via connect() / ping() error paths */
  });
  return client;
}

export const redis: Redis | undefined = globalForRedis.redis ?? makeRedis();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

let redisDisabled = false;

export async function connectRedis(): Promise<void> {
  if (!redis || redisDisabled) return;
  try {
    await redis.connect();
  } catch (err) {
    redisDisabled = true;
    redis.disconnect();
    console.warn(
      "Redis unreachable, continuing without it (rate-limit disabled):",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function pingRedis(): Promise<string> {
  if (!redis || redisDisabled) return "skipped";
  try {
    return await redis.ping();
  } catch {
    redisDisabled = true;
    return "error";
  }
}

export function isRedisDisabled(): boolean {
  return redisDisabled || !redis;
}

export function redisProviderLabel(): string {
  if (!redis || redisDisabled) return "disabled";
  return isUpstashRedis() ? "upstash" : "redis";
}
