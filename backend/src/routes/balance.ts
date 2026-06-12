import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { depositSchema } from "../schemas/balance.js";
import { getSettlementEngine } from "../services/settlement/index.js";
import { userAccountId } from "../config/constants.js";

export const balanceRouter = Router();

balanceRouter.use(requireAuth);

balanceRouter.get("/", async (req, res, next) => {
  try {
    const ledger = getSettlementEngine();
    const balance = await ledger.getBalance(userAccountId(req.userId!));
    res.json({ balance: balance.toString() });
  } catch (err) {
    next(err);
  }
});

balanceRouter.post("/deposit", validate(depositSchema), async (req, res, next) => {
  try {
    const { amount } = req.body as { amount: string };
    const ledger = getSettlementEngine();
    await ledger.deposit(req.userId!, BigInt(amount));
    const balance = await ledger.getBalance(userAccountId(req.userId!));
    res.json({ balance: balance.toString() });
  } catch (err) {
    next(err);
  }
});
