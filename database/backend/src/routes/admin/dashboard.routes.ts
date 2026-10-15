import { Router } from "express";
import { query } from "../mariaDbQuery";
import { requireAdmin } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import { getAllQuotes } from "../../services/marketData/quoteCache";

export function adminDashboardRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
      const [users, kyc, emails] = await Promise.all([
        query(
          `SELECT COUNT(*) AS total, SUM(created_at > UTC_TIMESTAMP(6) - INTERVAL 7 DAY) AS new_7d,
                  SUM(is_suspended) AS suspended
           FROM users`
        ),
        query(`SELECT status, COUNT(*) AS count FROM kyc_profiles GROUP BY status`),
        query(
          `SELECT SUM(status = 'SENT') AS sent, SUM(status = 'FAILED') AS failed
           FROM email_log WHERE created_at > UTC_TIMESTAMP(6) - INTERVAL 7 DAY`
        ),
      ]);
      const byStatus = Object.fromEntries(kyc.rows.map((r) => [r.status, Number(r.count)]));
      const quotes = getAllQuotes();

      res.json({
        totalClients: Number(users.rows[0].total ?? 0),
        newClients7d: Number(users.rows[0].new_7d ?? 0),
        suspendedClients: Number(users.rows[0].suspended ?? 0),
        verified: byStatus.APPROVED ?? 0,
        awaitingReview: byStatus.UNDER_REVIEW ?? 0,
        waitingOnClient: (byStatus.PENDING ?? 0) + (byStatus.ADDITIONAL_INFORMATION_REQUIRED ?? 0),
        declined: byStatus.REJECTED ?? 0,
        emailsSent7d: Number(emails.rows[0].sent ?? 0),
        emailsFailed7d: Number(emails.rows[0].failed ?? 0),
        liveMarkets: quotes.length,
      });
    })
  );

  return router;
}
