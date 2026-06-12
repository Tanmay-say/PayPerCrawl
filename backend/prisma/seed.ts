import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { userAccountId, TREASURY_ACCOUNT_ID } from "../src/config/constants.js";

const prisma = new PrismaClient();
const PASSWORD = "PayPerCrawl!seed12";
const BCRYPT_ROUNDS = 12;

async function createUser(
  email: string,
  role: Role,
  extra?: { walletAddress?: string },
) {
  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role, walletAddress: extra?.walletAddress },
    update: { passwordHash, role },
  });
  await prisma.ledgerAccount.upsert({
    where: { id: userAccountId(user.id) },
    create: { id: userAccountId(user.id), balance: 0n },
    update: {},
  });
  return user;
}

async function main() {
  await prisma.ledgerAccount.upsert({
    where: { id: TREASURY_ACCOUNT_ID },
    create: { id: TREASURY_ACCOUNT_ID, balance: 0n },
    update: {},
  });

  const publisherUser = await createUser("publisher@paypercrawl.dev", "PUBLISHER");
  const requesterUser = await createUser("requester@paypercrawl.dev", "REQUESTER");
  const worker1 = await createUser("worker1@paypercrawl.dev", "WORKER");
  const worker2 = await createUser("worker2@paypercrawl.dev", "WORKER");
  await createUser("admin@paypercrawl.dev", "ADMIN");

  await prisma.publisher.upsert({
    where: { userId: publisherUser.id },
    create: {
      userId: publisherUser.id,
      domain: "demo.paypercrawl.dev",
      pricePerCrawl: 1_000n,
      gateSecret: "seed-gate-secret-change-in-production",
      domainVerified: true,
    },
    update: {},
  });

  for (const w of [worker1, worker2]) {
    await prisma.worker.upsert({
      where: { userId: w.id },
      create: {
        userId: w.id,
        capabilities: ["JS", "TEXT"],
        minFee: 500n,
        stakeAmount: 0n,
      },
      update: {},
    });
  }

  console.log("Seed complete:");
  console.log("  publisher@paypercrawl.dev /", PASSWORD);
  console.log("  requester@paypercrawl.dev /", PASSWORD);
  console.log("  worker1@paypercrawl.dev /", PASSWORD);
  console.log("  admin@paypercrawl.dev /", PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
