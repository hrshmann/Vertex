import { Router } from "express";
import { z } from "zod";
import { query } from "../mariaDbQuery";
import { requireAdmin, requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/errorHandler";
import { logAudit } from "../../utils/audit";
import { parseLimit } from "../../utils/pagination";

export function adminUsersRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const search = (req.query.search as string | undefined)?.trim();
      const limit = parseLimit(req.query.limit, 50, 200);
      const params: any[] = [];
      let where = "";
      if (search) {
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
        where = `WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?`;
      }
      params.push(limit);
      const result = await query(
        `SELECT id, first_name, last_name, email, mobile, country, is_active, is_suspended, email_verified_at, created_at
         FROM users ${where} ORDER BY created_at DESC LIMIT ?`,
        params
      );
      res.json(result.rows);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const user = await query(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
      if (!user.rows[0]) throw new ApiError(404, "User not found");
      const { password_hash, ...safe } = user.rows[0];

      const [kyc, accounts, logins] = await Promise.all([
        query(`SELECT * FROM kyc_profiles WHERE user_id = ?`, [req.params.id]),
        query(`SELECT * FROM trading_accounts WHERE user_id = ?`, [req.params.id]),
        query(
          `SELECT action, ip_address, created_at FROM audit_logs WHERE actor_type = 'user' AND actor_id = ? AND action = 'LOGIN' ORDER BY created_at DESC LIMIT 20`,
          [req.params.id]
        ),
      ]);

      res.json({ ...safe, kyc: kyc.rows[0] ?? null, tradingAccounts: accounts.rows, loginHistory: logins.rows });
    })
  );

  router.post(
    "/:id/suspend",
    requireRole("SUPER_ADMIN", "COMPLIANCE"),
    asyncHandler(async (req, res) => {
      await query(`UPDATE users SET is_suspended = TRUE WHERE id = ?`, [req.params.id]);
      // End existing sessions; the short-lived access token (JWT_ACCESS_TTL) expires on its own.
      await query(
        `UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL`,
        [req.params.id]
      );
      await logAudit({
        actorType: "admin",
        actorId: req.admin!.id,
        action: "USER_SUSPENDED",
        targetType: "user",
        targetId: req.params.id,
      });
      res.json({ ok: true });
    })
  );

  router.post(
    "/:id/activate",
    requireRole("SUPER_ADMIN", "COMPLIANCE"),
    asyncHandler(async (req, res) => {
      await query(`UPDATE users SET is_suspended = FALSE WHERE id = ?`, [req.params.id]);
      await logAudit({
        actorType: "admin",
        actorId: req.admin!.id,
        action: "USER_ACTIVATED",
        targetType: "user",
        targetId: req.params.id,
      });
      res.json({ ok: true });
    })
  );

  const kycUpdateSchema = z.object({
    status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED"]),
    rejectionReason: z.string().optional(),
  });

  router.post(
    "/:id/kyc",
    requireRole("SUPER_ADMIN", "COMPLIANCE"),
    asyncHandler(async (req, res) => {
      const body = kycUpdateSchema.parse(req.body);
      await query(
        `UPDATE kyc_profiles SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = now(), updated_at = now()
         WHERE user_id = ?`,
        [body.status, body.rejectionReason ?? null, req.admin!.id, req.params.id]
      );
      const result = await query(`SELECT * FROM kyc_profiles WHERE user_id = ?`, [req.params.id]);
      if (!result.rows[0]) throw new ApiError(404, "KYC profile not found");

      await query(
        `INSERT INTO notifications (user_id, type, title, body) VALUES (?,'KYC_UPDATE','KYC status updated',?)`,
        [req.params.id, `Your KYC status is now ${body.status}${body.rejectionReason ? `: ${body.rejectionReason}` : ""}`]
      );
      await logAudit({
        actorType: "admin",
        actorId: req.admin!.id,
        action: "KYC_STATUS_UPDATED",
        targetType: "kyc_profile",
        targetId: result.rows[0].id,
        metadata: { status: body.status },
      });
      res.json(result.rows[0]);
    })
  );

  return router;
}
