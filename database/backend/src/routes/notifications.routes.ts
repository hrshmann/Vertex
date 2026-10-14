import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { query } from "./mariaDbQuery";

export function notificationsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const result = await query(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
        [req.user!.sub]
      );
      res.json(result.rows);
    })
  );

  router.post(
    "/:id/read",
    asyncHandler(async (req, res) => {
      await query(
        `UPDATE notifications SET read_at = now() WHERE id = ? AND user_id = ?`,
        [req.params.id, req.user!.sub]
      );
      res.json({ ok: true });
    })
  );

  return router;
}
