export interface EscrowRef {
  escrowId: string;
  jobId: string;
  amount: bigint;
}

export interface TxRef {
  txId: string;
  entries: string[];
}

export interface PayoutSplit {
  publisher: bigint;
  worker: bigint;
  protocol: bigint;
}

export interface SettlementEngine {
  lockEscrow(jobId: string, payer: string, amount: bigint): Promise<EscrowRef>;
  releaseToParties(jobId: string, split: PayoutSplit): Promise<TxRef>;
  refund(jobId: string): Promise<TxRef>;
  slash(workerId: string, amount: bigint, reason: string): Promise<TxRef>;
  getBalance(account: string): Promise<bigint>;
}
