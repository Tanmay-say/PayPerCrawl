import type { Prisma, PrismaClient } from "@prisma/client";
import type { EscrowRef, PayoutSplit, SettlementEngine, TxRef } from "../../types/settlement.js";
import {
  TREASURY_ACCOUNT_ID,
  escrowAccountId,
  userAccountId,
} from "../../config/constants.js";
import { AppError } from "../../middleware/error-handler.js";

type TxClient = Prisma.TransactionClient;

async function ensureAccount(tx: TxClient, accountId: string): Promise<void> {
  await tx.ledgerAccount.upsert({
    where: { id: accountId },
    create: { id: accountId, balance: 0n },
    update: {},
  });
}

async function recordEntry(
  tx: TxClient,
  accountId: string,
  delta: bigint,
  refType: string,
  refId: string,
): Promise<void> {
  await tx.ledgerEntry.create({
    data: { accountId, delta, refType, refId },
  });
}

async function transfer(
  tx: TxClient,
  from: string,
  to: string,
  amount: bigint,
  refType: string,
  refId: string,
): Promise<void> {
  if (amount <= 0n) {
    throw new AppError(400, "Transfer amount must be positive", "invalid_amount");
  }
  await ensureAccount(tx, from);
  await ensureAccount(tx, to);

  const fromAcct = await tx.ledgerAccount.findUniqueOrThrow({ where: { id: from } });
  if (fromAcct.balance < amount) {
    throw new AppError(400, "Insufficient balance", "insufficient_balance");
  }

  await tx.ledgerAccount.update({
    where: { id: from },
    data: { balance: { decrement: amount } },
  });
  await tx.ledgerAccount.update({
    where: { id: to },
    data: { balance: { increment: amount } },
  });
  await recordEntry(tx, from, -amount, refType, refId);
  await recordEntry(tx, to, amount, refType, refId);
}

/**
 * V1 simulated on-chain ledger. All money mutations run inside Prisma transactions.
 */
export class SimulatedLedger implements SettlementEngine {
  constructor(private readonly db: PrismaClient) {}

  async deposit(userId: string, amount: bigint): Promise<void> {
    if (amount <= 0n) {
      throw new AppError(400, "Deposit amount must be positive", "invalid_amount");
    }
    const account = userAccountId(userId);
    await this.db.$transaction(async (tx) => {
      await ensureAccount(tx, account);
      await tx.ledgerAccount.update({
        where: { id: account },
        data: { balance: { increment: amount } },
      });
      await recordEntry(tx, account, amount, "MINT", `deposit:${userId}:${Date.now()}`);
    });
  }

  async lockEscrow(jobId: string, payer: string, amount: bigint): Promise<EscrowRef> {
    const escrowId = escrowAccountId(jobId);
    await this.db.$transaction(async (tx) => {
      await transfer(tx, payer, escrowId, amount, "ESCROW_LOCK", jobId);
    });
    return { escrowId, jobId, amount };
  }

  async releaseToParties(jobId: string, split: PayoutSplit): Promise<TxRef> {
    const escrowId = escrowAccountId(jobId);
    const total = split.publisher + split.worker + split.protocol;
    const entries: string[] = [];

    await this.db.$transaction(async (tx) => {
      const escrow = await tx.ledgerAccount.findUnique({ where: { id: escrowId } });
      if (!escrow || escrow.balance < total) {
        throw new AppError(400, "Escrow insufficient for release", "escrow_insufficient");
      }

      await tx.ledgerAccount.update({
        where: { id: escrowId },
        data: { balance: { decrement: total } },
      });
      await recordEntry(tx, escrowId, -total, "ESCROW_RELEASE", jobId);

      if (split.protocol > 0n) {
        await ensureAccount(tx, TREASURY_ACCOUNT_ID);
        await tx.ledgerAccount.update({
          where: { id: TREASURY_ACCOUNT_ID },
          data: { balance: { increment: split.protocol } },
        });
        await recordEntry(tx, TREASURY_ACCOUNT_ID, split.protocol, "PROTOCOL_FEE", jobId);
        entries.push(`protocol:${split.protocol}`);
      }
      if (split.publisher > 0n) entries.push(`publisher:${split.publisher}`);
      if (split.worker > 0n) entries.push(`worker:${split.worker}`);
    });

    return { txId: `release:${jobId}`, entries };
  }

  /** Credit publisher/worker earnings fields after escrow release. */
  async creditEarnings(
    publisherId: string | null,
    workerId: string | null,
    split: PayoutSplit,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      if (publisherId && split.publisher > 0n) {
        await tx.publisher.update({
          where: { id: publisherId },
          data: { earningsBalance: { increment: split.publisher } },
        });
      }
      if (workerId && split.worker > 0n) {
        await tx.worker.update({
          where: { id: workerId },
          data: {
            earningsBalance: { increment: split.worker },
            jobsCompleted: { increment: 1 },
          },
        });
      }
    });
  }

  async refund(jobId: string): Promise<TxRef> {
    const escrowRow = await this.db.escrow.findUnique({ where: { jobId } });
    if (!escrowRow) {
      throw new AppError(404, "Escrow not found", "not_found");
    }
    const payer = escrowRow.payer;
    const escrowId = escrowAccountId(jobId);
    await this.db.$transaction(async (tx) => {
      const escrow = await tx.ledgerAccount.findUnique({ where: { id: escrowId } });
      if (!escrow || escrow.balance <= 0n) {
        throw new AppError(400, "Nothing to refund", "escrow_empty");
      }
      await transfer(tx, escrowId, payer, escrow.balance, "ESCROW_REFUND", jobId);
      await tx.escrow.update({
        where: { jobId },
        data: { status: "REFUNDED" },
      });
    });
    return { txId: `refund:${jobId}`, entries: [payer] };
  }

  async slash(workerId: string, amount: bigint, reason: string): Promise<TxRef> {
    if (amount <= 0n) {
      throw new AppError(400, "Slash amount must be positive", "invalid_amount");
    }
    await this.db.$transaction(async (tx) => {
      const worker = await tx.worker.findUnique({ where: { id: workerId } });
      if (!worker || worker.stakeAmount < amount) {
        throw new AppError(400, "Insufficient stake to slash", "insufficient_stake");
      }
      await tx.worker.update({
        where: { id: workerId },
        data: {
          stakeAmount: { decrement: amount },
          disputesLost: { increment: 1 },
        },
      });
      await ensureAccount(tx, TREASURY_ACCOUNT_ID);
      await tx.ledgerAccount.update({
        where: { id: TREASURY_ACCOUNT_ID },
        data: { balance: { increment: amount } },
      });
      await recordEntry(tx, TREASURY_ACCOUNT_ID, amount, "SLASH", `${workerId}:${reason}`);
    });
    return { txId: `slash:${workerId}`, entries: [TREASURY_ACCOUNT_ID] };
  }

  async stakeFromBalance(userId: string, workerId: string, amount: bigint): Promise<void> {
    const account = userAccountId(userId);
    await this.db.$transaction(async (tx) => {
      await ensureAccount(tx, account);
      const userAcct = await tx.ledgerAccount.findUniqueOrThrow({ where: { id: account } });
      if (userAcct.balance < amount) {
        throw new AppError(400, "Insufficient balance to stake", "insufficient_balance");
      }
      await tx.ledgerAccount.update({
        where: { id: account },
        data: { balance: { decrement: amount } },
      });
      await recordEntry(tx, account, -amount, "STAKE", workerId);
      await tx.worker.update({
        where: { id: workerId },
        data: { stakeAmount: { increment: amount } },
      });
    });
  }

  async getBalance(accountId: string): Promise<bigint> {
    const account = await this.db.ledgerAccount.findUnique({
      where: { id: accountId },
    });
    return account?.balance ?? 0n;
  }

  /** Conservation check: sum(ledger balances) + publisher earnings + worker stakes === total minted. */
  async getConservationSnapshot(): Promise<{
    ledgerSum: bigint;
    publisherEarnings: bigint;
    workerStakes: bigint;
    workerEarnings: bigint;
    totalMinted: bigint;
  }> {
    const [accounts, mintEntries, publishers, workers] = await Promise.all([
      this.db.ledgerAccount.aggregate({ _sum: { balance: true } }),
      this.db.ledgerEntry.aggregate({
        where: { refType: "MINT" },
        _sum: { delta: true },
      }),
      this.db.publisher.aggregate({ _sum: { earningsBalance: true } }),
      this.db.worker.aggregate({
        _sum: { stakeAmount: true, earningsBalance: true },
      }),
    ]);

    return {
      ledgerSum: accounts._sum.balance ?? 0n,
      publisherEarnings: publishers._sum.earningsBalance ?? 0n,
      workerStakes: workers._sum.stakeAmount ?? 0n,
      workerEarnings: workers._sum.earningsBalance ?? 0n,
      totalMinted: mintEntries._sum.delta ?? 0n,
    };
  }
}

export function escrowAccountForJob(jobId: string): string {
  return escrowAccountId(jobId);
}
