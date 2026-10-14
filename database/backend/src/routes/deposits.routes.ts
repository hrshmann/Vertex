import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { financialRateLimiter } from "../middleware/rateLimit";
import { DemoTradingEngine } from "../services/trading/demoEngine";
import { resolveAccountId } from "../services/trading/accountResolver";
import { logAudit } from "../utils/audit";
import { query } from "./mariaDbQuery";
import crypto from "node:crypto";

/**
 * Deposits are NEVER auto-completed here — they're created PENDING and only move to
 * COMPLETED/FAILED via a payment provider's webhook (see /api/webhooks/payments, which does
 * not exist yet: no payment provider has been configured, per the spec's requirement not to
 * fabricate confirmation). For the demo account, "completing" a deposit just credits play
 * money; it never touches a real payment rail.
 */
export function depositsRouter(demoEngine: DemoTradingEngine) {
  const router = Router();
  router.use(requireAuth, financialRateLimiter);

  const createSchema = z.object({
    mode: z.enum(["DEMO", "LIVE"]).default("DEMO"),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
    method: z.enum(["BANK_TRANSFER", "CARD", "CRYPTO"]),
  });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      const result = await query(
        `SELECT * FROM deposits WHERE trading_account_id = ? ORDER BY created_at DESC LIMIT 100`,
        [accountId]
      );
      res.json(result.rows);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const body = createSchema.parse(req.body);
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, body.mode);

      const depositId = crypto.randomUUID();
      await query(
        `INSERT INTO deposits (id, trading_account_id, amount, currency, method, status)
         VALUES (?,?,?,?,?,'PENDING')`,
        [depositId, accountId, body.amount, body.currency, body.method]
      );
      const result = await query(`SELECT * FROM deposits WHERE id = ?`, [depositId]);
      const deposit = result.rows[0];

      await logAudit({
        actorType: "user",
        actorId: req.user!.sub,
        action: "DEPOSIT_REQUESTED",
        targetType: "deposit",
        targetId: deposit.id,
        metadata: { amount: body.amount, method: body.method, mode: body.mode },
      });

      if (body.mode === "DEMO") {
        // Demo deposits settle immediately — it's play money, never a real payment rail.
        await query(
          `UPDATE deposits SET status = 'COMPLETED', confirmed_at = now(), provider_reference = 'DEMO-INSTANT' WHERE id = ?`,
          [deposit.id]
        );
        await query(
          `UPDATE balances SET cash_balance = cash_balance + ?, updated_at = now() WHERE trading_account_id = ?`,
          [body.amount, accountId]
        );
        await query(
          `INSERT INTO transactions (trading_account_id, type, amount, reference_id, description)
           VALUES (?,'DEPOSIT',?,?,'Demo deposit')`,
          [accountId, body.amount, deposit.id]
        );
        deposit.status = "COMPLETED";
      }

      res.status(201).json(deposit);
    })
  );

  return router;
}
