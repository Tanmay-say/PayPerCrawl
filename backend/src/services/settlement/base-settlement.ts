import type {
  EscrowRef,
  PayoutSplit,
  SettlementEngine,
  TxRef,
} from "../../types/settlement.js";

/**
 * Step 5 — Base on-chain settlement via viem + deployed PayPerCrawl contracts.
 *
 * Reads addresses from env or contracts/deployments/base-sepolia.json.
 * Wire behind SETTLEMENT_ENGINE=base in getSettlementEngine() — not active in V1.
 *
 * @see contracts/contracts/PayPerCrawlEscrow.sol
 * @see contracts/contracts/WorkerStake.sol
 */
export class BaseSettlementEngine implements SettlementEngine {
  async lockEscrow(
    _jobId: string,
    _payer: string,
    _amount: bigint,
  ): Promise<EscrowRef> {
    throw new Error("BaseSettlementEngine not implemented — Step 5");
  }

  async releaseToParties(_jobId: string, _split: PayoutSplit): Promise<TxRef> {
    throw new Error("BaseSettlementEngine not implemented — Step 5");
  }

  async refund(_jobId: string): Promise<TxRef> {
    throw new Error("BaseSettlementEngine not implemented — Step 5");
  }

  async slash(
    _workerId: string,
    _amount: bigint,
    _reason: string,
  ): Promise<TxRef> {
    throw new Error("BaseSettlementEngine not implemented — Step 5");
  }

  async getBalance(_account: string): Promise<bigint> {
    throw new Error("BaseSettlementEngine not implemented — Step 5");
  }
}
