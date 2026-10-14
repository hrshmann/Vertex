import { Router } from "express";
import { query } from "../mariaDbQuery";
import { requireAdmin } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";

export function adminDashboardRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
      const [
        totalUsers,
        verifiedUsers,
        pendingKyc,
        tradingAccounts,
        totalDeposits,
        pendingWithdrawals,
        openPositions,
      ] = await Promise.all([
        query("SELECT count(*) AS count FROM users"),
        query("SELECT count(*) AS count FROM users WHERE email_verified_at IS NOT NULL"),
        query("SELECT count(*) AS count FROM kyc_profiles WHERE status IN ('PENDING','UNDER_REVIEW')"),
        query("SELECT count(*) AS count FROM trading_accounts"),
        query("SELECT coalesce(sum(amount),0) AS total FROM deposits WHERE status = 'COMPLETED'"),
        query("SELECT count(*) AS count FROM withdrawals WHERE status = 'PENDING'"),
        query("SELECT count(*) AS count FROM positions WHERE status = 'OPEN'"),
      ]);

      res.json({
        totalUsers: Number(totalUsers.rows[0].count),
        verifiedUsers: Number(verifiedUsers.rows[0].count),
        pendingKyc: Number(pendingKyc.rows[0].count),
        tradingAccounts: Number(tradingAccounts.rows[0].count),
        totalDeposits: Number(totalDeposits.rows[0].total),
        pendingWithdrawals: Number(pendingWithdrawals.rows[0].count),
        openPositions: Number(openPositions.rows[0].count),
        systemStatus: "OPERATIONAL",
      });
    })
  );

  return router;
}
