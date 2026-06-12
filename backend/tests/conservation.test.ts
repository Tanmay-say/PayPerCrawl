import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SimulatedLedger } from "../src/services/settlement/simulated-ledger.js";
import { userAccountId } from "../src/config/constants.js";

const prisma = new PrismaClient();
const ledger = new SimulatedLedger(prisma);

async function assertConservation() {
  const snap = await ledger.getConservationSnapshot();
  const onBooks =
    snap.ledgerSum + snap.publisherEarnings + snap.workerStakes + snap.workerEarnings;
  expect(onBooks).toBe(snap.totalMinted);
}

async function databaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

describe("conservation of money", () => {
  let requesterId: string;
  let workerUserId: string;
  let workerId: string;
  let canRun = false;

  beforeAll(async () => {
    canRun = await databaseReachable();
    if (!canRun) return;

    const passwordHash = await bcrypt.hash("test-password-12chars", 12);
    const requester = await prisma.user.create({
      data: {
        email: `conservation-req-${Date.now()}@test.dev`,
        passwordHash,
        role: "REQUESTER",
      },
    });
    const workerUser = await prisma.user.create({
      data: {
        email: `conservation-worker-${Date.now()}@test.dev`,
        passwordHash,
        role: "WORKER",
      },
    });
    requesterId = requester.id;
    workerUserId = workerUser.id;

    await prisma.ledgerAccount.create({
      data: { id: userAccountId(requesterId), balance: 0n },
    });
    await prisma.ledgerAccount.create({
      data: { id: userAccountId(workerUserId), balance: 0n },
    });

    const worker = await prisma.worker.create({
      data: {
        userId: workerUserId,
        capabilities: ["TEXT"],
        minFee: 100n,
      },
    });
    workerId = worker.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sum(balances) + earnings + stakes === totalMinted after deposit/stake", async (ctx) => {
    if (!canRun) {
      ctx.skip();
      return;
    }

    await ledger.deposit(requesterId, 100_000n);
    await assertConservation();

    await ledger.stakeFromBalance(workerUserId, workerId, 10_000n);
    await assertConservation();

    const balance = await ledger.getBalance(userAccountId(requesterId));
    expect(balance).toBe(90_000n);
  });
});
