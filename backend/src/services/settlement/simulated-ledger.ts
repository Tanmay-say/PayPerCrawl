import type { PrismaClient } from "@prisma/client";
import type { EscrowRef, PayoutSplit, SettlementEngine, TxRef } from "../../types/settlement.js";
import { escrowAccountId } from "../../config/constants.js";

/**
 * V1 simulated on-chain ledger. All money mutations run inside Prisma transactions.
 * Implementation: Step 1.
 */
export class SimulatedLedger implements SettlementEngine {
  constructor(private readonly db: PrismaClient) {}

  async lockEscrow(_jobId: string, _payer: string, _amount: bigint): Promise<EscrowRef> {
    throw new Error("SimulatedLedger.lockEscrow not implemented");
  }

  async releaseToParties(_jobId: string, _split: PayoutSplit): Promise<TxRef> {
    throw new Error("SimulatedLedger.releaseToParties not implemented");
  }

  async refund(_jobId: string): Promise<TxRef> {
    throw new Error("SimulatedLedger.refund not implemented");
  }

  async slash(_workerId: string, _amount: bigint, _reason: string): Promise<TxRef> {
    throw new Error("SimulatedLedger.slash not implemented");
  }

  async getBalance(accountId: string): Promise<bigint> {
    const account = await this.db.ledgerAccount.findUnique({
      where: { id: accountId },
    });
    return account?.balance ?? 0n;
  }
}

export function escrowAccountForJob(jobId: string): string {
  return escrowAccountId(jobId);
}
