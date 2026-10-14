import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { DemoTradingEngine } from "../services/trading/demoEngine";
import { resolveAccountId } from "../services/trading/accountResolver";
import { query } from "./mariaDbQuery";
import { ApiError } from "../middleware/errorHandler";

export function positionsRouter(demoEngine: DemoTradingEngine) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      res.json(await demoEngine.getPositions(accountId));
    })
  );

  router.post(
    "/:id/close",
    asyncHandler(async (req, res) => {
      const schema = z.object({ volume: z.number().positive().optional() });
      const { volume } = schema.parse(req.body ?? {});

      const owns = await query(
        `SELECT p.id FROM positions p JOIN trading_accounts ta ON ta.id = p.trading_account_id
         WHERE p.id = ? AND ta.user_id = ?`,
        [req.params.id, req.user!.sub]
      );
      if (!owns.rows[0]) throw new ApiError(404, "Position not found");

      await demoEngine.closePosition(req.params.id, volume);
      res.json({ ok: true });
    })
  );

  return router;
}
