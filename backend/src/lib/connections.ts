import { isSupabasePooler } from "../config/env.js";
import { pingRedis, redisProviderLabel } from "./redis.js";
import { pingDatabase } from "./prisma.js";

export interface ConnectionStatus {
  database: "connected" | "error";
  redis: "connected" | "error";
  providers: {
    database: "supabase" | "postgresql";
    redis: string;
    pooler: boolean;
  };
  errors?: string[];
}

export async function verifyConnections(): Promise<ConnectionStatus> {
  const errors: string[] = [];
  let database: ConnectionStatus["database"] = "connected";
  let redis: ConnectionStatus["redis"] = "connected";

  try {
    await pingDatabase();
  } catch (err) {
    database = "error";
    errors.push(`database: ${formatError(err)}`);
  }

  try {
    await pingRedis();
  } catch (err) {
    redis = "error";
    errors.push(`redis: ${formatError(err)}`);
  }

  const isSupabase =
    process.env.DATABASE_URL?.includes("supabase.co") ||
    process.env.DIRECT_URL?.includes("supabase.co");

  return {
    database,
    redis,
    providers: {
      database: isSupabase ? "supabase" : "postgresql",
      redis: redisProviderLabel(),
      pooler: isSupabasePooler(),
    },
    ...(errors.length > 0 ? { errors } : {}),
  };
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
