/**
 * Seed script — implemented in Step 1.
 * Run: bun prisma db seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // TODO(Step 1): seed 1 publisher, 1 requester, 2 workers, 1 admin
  console.log("Seed not yet implemented — run after Step 1 auth + ledger.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
