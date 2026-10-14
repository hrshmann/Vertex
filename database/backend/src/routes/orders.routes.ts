import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { DemoTradingEngine } from "../services/trading/demoEngine";
import { resolveAccountId } from "../services/trading/accountResolver";
import { query } from "./mariaDbQuery";
import { ApiError } from "../middleware/errorHandler";

const placeOrderSchema = z.object({
  mode: z.enum(["DEMO", "LIVE"]).default("DEMO"),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  volume: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

export function ordersRouter(demoEngine: DemoTradingEngine) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const mode = String(req.query.mode ?? "DEMO");
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, mode);
      res.json(await demoEngine.getOrders(accountId));
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const body = placeOrderSchema.parse(req.body);
      if ((body.type === "LIMIT" || body.type === "STOP_LIMIT") && body.limitPrice === undefined) {
        throw new ApiError(400, "limitPrice is required for LIMIT/STOP_LIMIT orders");
      }
      if ((body.type === "STOP" || body.type === "STOP_LIMIT") && body.stopPrice === undefined) {
        throw new ApiError(400, "stopPrice is required for STOP/STOP_LIMIT orders");
      }
      const accountId = await resolveAccountId(demoEngine, req.user!.sub, body.mode);
      const order = await demoEngine.placeOrder(
        accountId,
        {
          symbol: body.symbol,
          side: body.side,
          type: body.type,
          volume: body.volume,
          limitPrice: body.limitPrice,
          stopPrice: body.stopPrice,
          stopLoss: body.stopLoss,
          takeProfit: body.takeProfit,
        },
        req.user!.sub
      );
      res.status(201).json(order);
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const patchSchema = z.object({
        stopLoss: z.number().positive().optional(),
        takeProfit: z.number().positive().optional(),
        limitPrice: z.number().positive().optional(),
      });
      const body = patchSchema.parse(req.body);
      await assertOwnsOrder(req.user!.sub, req.params.id);
      const updated = await demoEngine.modifyOrder(req.params.id, body);
      res.json(updated);
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      await assertOwnsOrder(req.user!.sub, req.params.id);
      await demoEngine.cancelOrder(req.params.id);
      res.status(204).send();
    })
  );

  async function assertOwnsOrder(userId: string, orderId: string) {
    const res = await query(
      `SELECT o.id FROM orders o JOIN trading_accounts ta ON ta.id = o.trading_account_id
       WHERE o.id = ? AND ta.user_id = ?`,
      [orderId, userId]
    );
    if (!res.rows[0]) throw new ApiError(404, "Order not found");
  }

  return router;
}
