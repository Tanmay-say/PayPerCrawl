import "dotenv/config";

// Vitest: fall back DIRECT_URL for Prisma when only DATABASE_URL is set
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
