import {
  isRedisDisabled,
  pingRedis,
  redis,
  redisProviderLabel,
} from "./redis.js";
import { pingDatabase } from "./prisma.js";
import { env } from "../config/env.js";

export interface ConnectionStatus {
  database: "connected" | "error";
  redis: "connected" | "error" | "disabled";
  providers: {
    database: "supabase" | "postgresql";
    redis: string;
    pooler: boolean;
  };
  errors?: string[];
}

function isPooler(): boolean {
  return (
    env.DATABASE_URL.includes("pooler.supabase.com") ||
    env.DATABASE_URL.includes("pgbouncer=true")
  );
}

export async function verifyConnections(): Promise<ConnectionStatus> {
  const errors: string[] = [];
  let database: ConnectionStatus["database"] = "connected";
  let redisStatus: ConnectionStatus["redis"] =
    !redis || isRedisDisabled() ? "disabled" : "connected";

  try {
    await pingDatabase();
  } catch (err) {
    database = "error";
    errors.push(`database: ${formatError(err)}`);
  }

  if (redis && !isRedisDisabled()) {
    try {
      await pingRedis();
    } catch (err) {
      redisStatus = "error";
      errors.push(`redis: ${formatError(err)}`);
    }
  }

  const isSupabase =
    env.DATABASE_URL.includes("supabase.co") ||
    (env.DIRECT_URL?.includes("supabase.co") ?? false);

  return {
    database,
    redis: redisStatus,
    providers: {
      database: isSupabase ? "supabase" : "postgresql",
      redis: redisProviderLabel(),
      pooler: isPooler(),
    },
    ...(errors.length > 0 ? { errors } : {}),
  };
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
