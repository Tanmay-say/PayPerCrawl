import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  /** Runtime DB URL — Supabase: pooler (6543) with ?pgbouncer=true&connection_limit=1 */
  DATABASE_URL: z.string().min(1),
  /** Migrations — Supabase: direct (5432). Falls back to DATABASE_URL. */
  DIRECT_URL: z.string().min(1).optional(),
  /** Optional. Local: redis:// — Upstash: rediss:// (TLS). When unset, rate-limiting and ping are skipped. */
  REDIS_URL: z
    .string()
    .optional()
    .refine(
      (u) => !u || u.startsWith("redis://") || u.startsWith("rediss://"),
      { message: "REDIS_URL must start with redis:// or rediss://" },
    ),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  /** Base Sepolia public RPC by default. */
  BASE_RPC_URL: z.string().default("https://sepolia.base.org"),
  BASE_CHAIN_ID: z.coerce.number().default(84532),

  /** Protocol fee — 1000 = 10% (publisher gets 90%). */
  PROTOCOL_FEE_BPS: z.coerce.number().default(1000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = parsed.data.DATABASE_URL;
  }

  return parsed.data;
}

export const env = loadEnv();
