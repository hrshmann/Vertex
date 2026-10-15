import { Router } from "express";
import { query } from "./mariaDbQuery";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { DemoTradingEngine } from "../services/trading/demoEngine";
import { resolveAccountId } from "../services/trading/accountResolver";
import { parseLimit } from "../utils/pagination";

export function accountRouter(demoEngine: DemoTradingEngine) {
  const router = Router();

  // Public: account-tier info is marketing content, shown on /account-types with no login.
  router.get(
    "/tiers",
    asyncHandler(async (_req, res) => {
      const result = await query("SELECT * FROM account_tier_configs ORDER BY min_deposit");
      res.json(result.rows);
    })
  );

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      const account = await demoEngine.getAccount(accountId);
      res.json(account);
    })
  );

  router.get(
    "/balance",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      const balances = await demoEngine.getBalances(accountId);
      res.json(balances);
    })
  );

  router.get(
    "/transactions",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      const limit = parseLimit(req.query.limit, 100, 500);
      const result = await query(
        `SELECT * FROM transactions WHERE trading_account_id = ? ORDER BY created_at DESC LIMIT ?`,
        [accountId, limit]
      );
      res.json(result.rows);
    })
  );

  return router;
}
