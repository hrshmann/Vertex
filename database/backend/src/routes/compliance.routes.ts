import { Router } from "express";
import { pool } from "../db/pool";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Serves admin-configurable compliance/legal page content (spec section 30).
 * Every value is seeded as an explicit PLACEHOLDER — the operating entity must replace
 * each one with text matched to its actual jurisdiction and licenses before launch, and
 * platform.is_licensed_broker must only be set true once that's actually the case.
 */
export function complianceRouter() {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const result = await pool.query(
        `SELECT \`key\`, value FROM system_settings WHERE \`key\` LIKE 'compliance.%' OR \`key\` LIKE 'platform.%'`
      );
      const out: Record<string, unknown> = {};
      for (const row of result.rows) out[row.key] = row.value;
      res.json(out);
    })
  );

  return router;
}
