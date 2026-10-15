import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../../db/pool";
import { query } from "../mariaDbQuery";
import { requireAdmin, requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middleware/errorHandler";

export function adminWithdrawalsRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const status = req.query.status as string | undefined;
      const result = await query(
        status
          ? `SELECT w.*, ta.user_id FROM withdrawals w JOIN trading_accounts ta ON ta.id = w.trading_account_id WHERE w.status = ? ORDER BY w.created_at DESC LIMIT 200`
          : `SELECT w.*, ta.user_id FROM withdrawals w JOIN trading_accounts ta ON ta.id = w.trading_account_id ORDER BY w.created_at DESC LIMIT 200`,
        status ? [status] : []
      );
      res.json(result.rows);
    })
  );

  const decisionSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

  router.post(
    "/:id/decision",
    requireRole("SUPER_ADMIN", "FINANCE"),
    asyncHandler(async (req, res) => {
      const body = decisionSchema.parse(req.body);
      const withdrawal = await withTransaction(async (client) => {
        const updateResult = await client.query(
          `UPDATE withdrawals SET status = ?, approved_by = ?, processed_at = now()
           WHERE id = ? AND status = 'PENDING'`,
          [body.status, req.admin!.id, req.params.id]
        );
        if (updateResult.rowCount !== 1) {
          throw new ApiError(404, "Withdrawal not found or already decided");
        }

        const result = await client.query(`SELECT * FROM withdrawals WHERE id = ?`, [req.params.id]);
        const withdrawal = result.rows[0];
        if (!withdrawal) throw new ApiError(404, "Withdrawal not found or already decided");

        if (body.status === "APPROVED") {
          // Free margin is re-checked here: it may have shrunk since the request was made.
          const balanceUpdate = await client.query(
            `UPDATE balances SET cash_balance = cash_balance - ?, updated_at = now()
             WHERE trading_account_id = ? AND cash_balance - used_margin >= ?`,
            [withdrawal.amount, withdrawal.trading_account_id, withdrawal.amount]
          );
          if (balanceUpdate.rowCount !== 1) {
            throw new ApiError(409, "Insufficient free margin to approve this withdrawal");
          }
          await client.query(
            `INSERT INTO transactions (trading_account_id, type, amount, reference_id, description)
             VALUES (?,'WITHDRAWAL',?,?,'Withdrawal approved')`,
            [withdrawal.trading_account_id, -withdrawal.amount, withdrawal.id]
          );
        }

        const userRes = await client.query(`SELECT user_id FROM trading_accounts WHERE id = ?`, [
          withdrawal.trading_account_id,
        ]);
        if (!userRes.rows[0]) throw new Error("Trading account not found for withdrawal");
        await client.query(
          `INSERT INTO notifications (user_id, type, title, body) VALUES (?,'WITHDRAWAL_UPDATE','Withdrawal update',?)`,
          [userRes.rows[0].user_id, `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} was ${body.status.toLowerCase()}`]
        );
        return withdrawal;
      });

      await logAudit({
        actorType: "admin",
        actorId: req.admin!.id,
        action: "WITHDRAWAL_DECISION",
        targetType: "withdrawal",
        targetId: withdrawal.id,
        metadata: { status: body.status },
      });

      res.json(withdrawal);
    })
  );

  return router;
}
