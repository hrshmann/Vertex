import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { financialRateLimiter } from "../middleware/rateLimit";
import { DemoTradingEngine } from "../services/trading/demoEngine";
import { resolveAccountId } from "../services/trading/accountResolver";
import { logAudit } from "../utils/audit";
import { ApiError } from "../middleware/errorHandler";
import { query } from "./mariaDbQuery";
import crypto from "node:crypto";

export function withdrawalsRouter(demoEngine: DemoTradingEngine) {
  const router = Router();
  router.use(requireAuth, financialRateLimiter);

  const createSchema = z.object({
    mode: z.enum(["DEMO", "LIVE"]).default("DEMO"),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
    method: z.enum(["BANK_TRANSFER", "CARD", "CRYPTO"]),
    destination: z.string().min(3),
    notes: z.string().optional(),
  });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      const result = await query(
        `SELECT * FROM withdrawals WHERE trading_account_id = ? ORDER BY created_at DESC LIMIT 100`,
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

      const kyc = await query(`SELECT status FROM kyc_profiles WHERE user_id = ?`, [req.user!.sub]);
      if (kyc.rows[0]?.status !== "APPROVED") {
        throw new ApiError(403, "Verify your identity before making a withdrawal.");
      }

      const balances = await query(
        `SELECT cash_balance, used_margin FROM balances WHERE trading_account_id = ?`,
        [accountId]
      );
      const freeMargin = Number(balances.rows[0].cash_balance) - Number(balances.rows[0].used_margin);
      if (body.amount > freeMargin) {
        throw new ApiError(400, `Withdrawal exceeds available free margin (${freeMargin.toFixed(2)})`);
      }

      // In production this is gated on: OTP confirmation, 2FA, and (for LIVE) compliance review —
      // none of which is faked here. The request is simply recorded PENDING for an admin/compliance
      // actor to approve, per the spec's withdrawal status flow.
      const withdrawalId = crypto.randomUUID();
      await query(
        `INSERT INTO withdrawals (id, trading_account_id, amount, currency, method, destination, notes, status)
         VALUES (?,?,?,?,?,?,?,'PENDING')`,
        [withdrawalId, accountId, body.amount, body.currency, body.method, body.destination, body.notes ?? null]
      );
      const result = await query(`SELECT * FROM withdrawals WHERE id = ?`, [withdrawalId]);

      await logAudit({
        actorType: "user",
        actorId: req.user!.sub,
        action: "WITHDRAWAL_REQUESTED",
        targetType: "withdrawal",
        targetId: result.rows[0].id,
        metadata: { amount: body.amount, method: body.method },
      });

      res.status(201).json(result.rows[0]);
    })
  );

  return router;
}
