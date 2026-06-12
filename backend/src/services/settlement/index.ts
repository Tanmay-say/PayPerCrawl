import { prisma } from "../../lib/prisma.js";
import { SimulatedLedger } from "./simulated-ledger.js";

let ledgerInstance: SimulatedLedger | null = null;

export function getSettlementEngine(): SimulatedLedger {
  if (!ledgerInstance) {
    ledgerInstance = new SimulatedLedger(prisma);
  }
  return ledgerInstance;
}

export { SimulatedLedger } from "./simulated-ledger.js";
// Step 5: import { BaseSettlementEngine } from "./base-settlement.js";
// SETTLEMENT_ENGINE=base → BaseSettlementEngine, else SimulatedLedger
