import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  /** Runtime DB URL — Supabase: use pooler (port 6543) with ?pgbouncer=true */
  DATABASE_URL: z.string().min(1),
  /** Migrations — Supabase: direct connection (port 5432). Falls back to DATABASE_URL. */
  DIRECT_URL: z.string().min(1).optional(),
  /** Local: redis:// — Upstash: rediss:// (TLS) */
  REDIS_URL: z
    .string()
    .min(1)
    .refine((u) => u.startsWith("redis://") || u.startsWith("rediss://"), {
      message: "REDIS_URL must start with redis:// or rediss://",
    }),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY: z.string().length(64),
  PROTOCOL_FEE_BPS: z.coerce.number().default(400),
  PUBLISHER_SHARE_BPS: z.coerce.number().default(7000),
  WORKER_SHARE_BPS: z.coerce.number().default(2500),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  // Prisma directUrl (Supabase migrations) — default to DATABASE_URL for local Postgres
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = parsed.data.DATABASE_URL;
  }

  return parsed.data;
}

export const env = loadEnv();

export function isUpstashRedis(): boolean {
  return env.REDIS_URL.startsWith("rediss://");
}

export function isSupabasePooler(): boolean {
  return (
    env.DATABASE_URL.includes("pooler.supabase.com") ||
    env.DATABASE_URL.includes("pgbouncer=true")
  );
}
