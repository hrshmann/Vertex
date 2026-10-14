import { Router } from "express";
import { z } from "zod";
import { query } from "../mariaDbQuery";
import { requireAdmin, requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import { loadInstrumentCache } from "../../services/marketData/instrumentCache";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middleware/errorHandler";

export function adminInstrumentsRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const result = await query("SELECT * FROM instruments ORDER BY symbol");
      res.json(result.rows);
    })
  );

  const patchSchema = z.object({
    tradingEnabled: z.boolean().optional(),
    minVolume: z.number().positive().optional(),
    maxVolume: z.number().positive().optional(),
    volumeStep: z.number().positive().optional(),
    maxLeverage: z.number().int().positive().optional(),
    contractSize: z.number().positive().optional(),
  });

  /**
   * Admin can configure trading permissions/limits — never the live price itself (spot/mid
   * prices always come from the connected market-data provider, per spec section 18).
   */
  router.patch(
    "/:id",
    requireRole("SUPER_ADMIN", "TRADING_ADMIN"),
    asyncHandler(async (req, res) => {
      const body = patchSchema.parse(req.body);
      await query(
        `UPDATE instruments SET
           trading_enabled = COALESCE(?, trading_enabled),
           min_volume = COALESCE(?, min_volume),
           max_volume = COALESCE(?, max_volume),
           volume_step = COALESCE(?, volume_step),
           max_leverage = COALESCE(?, max_leverage),
           contract_size = COALESCE(?, contract_size),
           updated_at = now()
         WHERE id = ?`,
        [
          body.tradingEnabled ?? null,
          body.minVolume ?? null,
          body.maxVolume ?? null,
          body.volumeStep ?? null,
          body.maxLeverage ?? null,
          body.contractSize ?? null,
          req.params.id,
        ]
      );
      const result = await query(`SELECT * FROM instruments WHERE id = ?`, [req.params.id]);
      if (!result.rows[0]) throw new ApiError(404, "Instrument not found");

      await loadInstrumentCache(); // refresh in-memory cache so the change takes effect immediately
      await logAudit({
        actorType: "admin",
        actorId: req.admin!.id,
        action: "INSTRUMENT_CONFIG_UPDATED",
        targetType: "instrument",
        targetId: req.params.id,
        metadata: body,
      });
      res.json(result.rows[0]);
    })
  );

  return router;
}
