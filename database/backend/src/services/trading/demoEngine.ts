import crypto from "node:crypto";
import { DbConnection, pool, withTransaction } from "../../db/pool";
import { isDuplicateKeyError } from "../../utils/dbErrors";
import { getInstrumentBySymbol, getInstrumentById } from "../marketData/instrumentCache";
import { getQuote } from "../marketData/quoteCache";
import { calcRequiredMargin, calcUnrealizedPnl, computeMarginSnapshot } from "./riskEngine";
import { Account, OrderSide, OrderType, PlaceOrderInput, TradingProvider } from "../../types";
import { WsHub } from "../ws/wsHub";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middleware/errorHandler";

const DEMO_STARTING_BALANCE = 10_000;

/**
 * DEMO trading provider. Implements the TradingProvider interface by matching orders
 * internally against the live/indicative quote cache — clearly simulated, as required for
 * any DEMO account (spec section 27). No LIVE provider is implemented: that would call an
 * authorized broker/exchange's official API with real credentials, neither of which this
 * project has been given. See types.ts for the interface a LIVE adapter would satisfy.
 */
export class DemoTradingEngine implements TradingProvider {
  constructor(private hub: WsHub) {}

  /**
   * Returns the user's demo account id, creating it if needed. Pass `client` to create it inside
   * the caller's transaction (e.g. registration); otherwise it runs in its own transaction.
   */
  async ensureDemoAccount(userId: string, client?: Pick<DbConnection, "query">): Promise<string> {
    const existingId = await this.findDemoAccountId(client ?? pool, userId);
    if (existingId) return existingId;
    if (client) return this.createDemoAccount(client, userId);

    try {
      return await withTransaction((tx) => this.createDemoAccount(tx, userId));
    } catch (err) {
      // A concurrent request created the account first (UNIQUE user_id, mode).
      if (isDuplicateKeyError(err)) {
        const createdId = await this.findDemoAccountId(pool, userId);
        if (createdId) return createdId;
      }
      throw err;
    }
  }

  private async findDemoAccountId(db: Pick<DbConnection, "query">, userId: string) {
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM trading_accounts WHERE user_id = ? AND mode = 'DEMO'`,
      [userId]
    );
    return existing.rows[0]?.id;
  }

  private async createDemoAccount(client: Pick<DbConnection, "query">, userId: string) {
    const accountId = crypto.randomUUID();
    const acc = await client.query(
      `INSERT INTO trading_accounts (id, user_id, mode, tier, currency, leverage)
       VALUES (?, ?, 'DEMO', 'STANDARD', 'USD', 100)`,
      [accountId, userId]
    );
    if (acc.rowCount !== 1) throw new Error("Failed to create demo trading account");
    await client.query(
      `INSERT INTO balances (trading_account_id, cash_balance, used_margin) VALUES (?, ?, 0)`,
      [accountId, DEMO_STARTING_BALANCE]
    );
    await client.query(
      `INSERT INTO transactions (trading_account_id, type, amount, description)
       VALUES (?, 'ADJUSTMENT', ?, 'Demo account initial balance')`,
      [accountId, DEMO_STARTING_BALANCE]
    );
    return accountId;
  }

  async getAccount(tradingAccountId: string): Promise<Account> {
    const accRes = await pool.query(
      `SELECT ta.mode, ta.currency, ta.leverage, b.cash_balance, b.used_margin
       FROM trading_accounts ta JOIN balances b ON b.trading_account_id = ta.id
       WHERE ta.id = ?`,
      [tradingAccountId]
    );
    if (!accRes.rows[0]) throw new ApiError(404, "Trading account not found");
    const { mode, currency, leverage, cash_balance, used_margin } = accRes.rows[0];

    const unrealizedPnl = await this.sumUnrealizedPnl(tradingAccountId);
    const snap = computeMarginSnapshot(Number(cash_balance), Number(used_margin), unrealizedPnl);

    return {
      id: tradingAccountId,
      balance: snap.balance,
      equity: snap.equity,
      usedMargin: snap.usedMargin,
      freeMargin: snap.freeMargin,
      marginLevel: snap.marginLevel,
      unrealizedPnl: snap.unrealizedPnl,
      currency,
      mode,
      riskState: snap.riskState,
      leverage,
    };
  }

  async getBalances(tradingAccountId: string) {
    const res = await pool.query(
      `SELECT cash_balance, used_margin FROM balances WHERE trading_account_id = ?`,
      [tradingAccountId]
    );
    if (!res.rows[0]) throw new ApiError(404, "Balances not found for account");
    return { cashBalance: Number(res.rows[0].cash_balance), usedMargin: Number(res.rows[0].used_margin) };
  }

  async getPositions(tradingAccountId: string) {
    const res = await pool.query(
      `SELECT p.*, i.symbol FROM positions p JOIN instruments i ON i.id = p.instrument_id
       WHERE p.trading_account_id = ? AND p.status = 'OPEN' ORDER BY p.opened_at DESC`,
      [tradingAccountId]
    );
    return res.rows.map((row) => this.mapPositionRow(row));
  }

  async getOrders(tradingAccountId: string) {
    const res = await pool.query(
      `SELECT o.*, i.symbol FROM orders o JOIN instruments i ON i.id = o.instrument_id
       WHERE o.trading_account_id = ? ORDER BY o.created_at DESC LIMIT 200`,
      [tradingAccountId]
    );
    return res.rows;
  }

  async getQuote(symbol: string) {
    return getQuote(symbol);
  }

  async placeOrder(tradingAccountId: string, input: PlaceOrderInput, userId?: string) {
    const instrument = getInstrumentBySymbol(input.symbol);
    if (!instrument) throw new ApiError(400, `Unknown instrument: ${input.symbol}`);
    if (!instrument.tradingEnabled) throw new ApiError(400, `Trading disabled for ${input.symbol}`);
    if (!instrument.isExecutable) {
      throw new ApiError(
        400,
        `${input.symbol} is indicative-only (no real-time executable feed connected) and cannot be traded yet.`
      );
    }
    if (input.volume < instrument.minVolume || input.volume > instrument.maxVolume) {
      throw new ApiError(
        400,
        `Volume must be between ${instrument.minVolume} and ${instrument.maxVolume} for ${input.symbol}`
      );
    }

    const quote = getQuote(input.symbol);
    if (!quote) throw new ApiError(503, `No live quote available for ${input.symbol} yet`);

    const accRes = await pool.query(`SELECT leverage FROM trading_accounts WHERE id = ?`, [
      tradingAccountId,
    ]);
    if (!accRes.rows[0]) throw new ApiError(404, "Trading account not found");
    const leverage = Math.min(accRes.rows[0].leverage, instrument.maxLeverage);

    const entryPriceEstimate = input.side === "BUY" ? quote.ask : quote.bid;
    const requiredMargin = calcRequiredMargin(instrument, input.volume, entryPriceEstimate, leverage);

    const balances = await this.getBalances(tradingAccountId);
    const unrealizedPnl = await this.sumUnrealizedPnl(tradingAccountId);
    const snap = computeMarginSnapshot(balances.cashBalance, balances.usedMargin, unrealizedPnl);
    if (requiredMargin > snap.freeMargin) {
      throw new ApiError(
        400,
        `Insufficient free margin: need ~${requiredMargin.toFixed(2)} ${instrument.quoteAsset === "USDT" ? "USD" : instrument.quoteAsset}, have ${snap.freeMargin.toFixed(2)}`
      );
    }

    const isImmediate = input.type === "MARKET";

    const orderId = (await pool.query<{ id: string }>(`SELECT UUID() AS id`)).rows[0].id;
    const orderRes = await pool.query(
      `INSERT INTO orders (id, trading_account_id, instrument_id, side, type, volume, limit_price, stop_price, stop_loss, take_profit, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderId,
        tradingAccountId,
        instrument.id,
        input.side,
        input.type,
        input.volume,
        input.limitPrice ?? null,
        input.stopPrice ?? null,
        input.stopLoss ?? null,
        input.takeProfit ?? null,
        isImmediate ? "FILLED" : "OPEN",
      ]
    );
    if (orderRes.rowCount !== 1) throw new Error("Failed to create order");

    if (userId) {
      await logAudit({
        actorType: "user",
        actorId: userId,
        action: "ORDER_PLACED",
        targetType: "order",
        targetId: orderId,
        metadata: { symbol: input.symbol, side: input.side, type: input.type, volume: input.volume },
      });
    }

    if (isImmediate) {
      await this.fillOrder(orderId, entryPriceEstimate);
    }

    this.hub.sendToUser(await this.userIdForAccount(tradingAccountId), "order.created", {
      orderId,
      symbol: input.symbol,
      status: isImmediate ? "FILLED" : "OPEN",
    });

    const fresh = await pool.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    return fresh.rows[0];
  }

  async modifyOrder(orderId: string, patch: Partial<PlaceOrderInput>) {
    await pool.query(
      `UPDATE orders SET stop_loss = COALESCE(?, stop_loss), take_profit = COALESCE(?, take_profit),
        limit_price = COALESCE(?, limit_price) WHERE id = ? AND status IN ('PENDING','OPEN')`,
      [patch.stopLoss ?? null, patch.takeProfit ?? null, patch.limitPrice ?? null, orderId]
    );
    const res = await pool.query(
      `SELECT * FROM orders WHERE id = ? AND status IN ('PENDING','OPEN')`,
      [orderId]
    );
    if (!res.rows[0]) throw new ApiError(404, "Order not found or not modifiable");
    return res.rows[0];
  }

  async cancelOrder(orderId: string) {
    const res = await pool.query(
      `UPDATE orders SET status = 'CANCELLED', cancelled_at = now()
       WHERE id = ? AND status IN ('PENDING','OPEN')`,
      [orderId]
    );
    if (res.rowCount !== 1) throw new ApiError(404, "Order not found or already finalized");
    const order = await pool.query(`SELECT trading_account_id FROM orders WHERE id = ?`, [orderId]);
    if (!order.rows[0]) throw new ApiError(404, "Order not found or already finalized");
    this.hub.sendToUser(await this.userIdForAccount(order.rows[0].trading_account_id), "order.cancelled", {
      orderId,
    });
  }

  async closePosition(positionId: string, volume?: number) {
    const posRes = await pool.query(
      `SELECT p.*, i.symbol FROM positions p JOIN instruments i ON i.id = p.instrument_id WHERE p.id = ? AND p.status = 'OPEN'`,
      [positionId]
    );
    const pos = posRes.rows[0];
    if (!pos) throw new ApiError(404, "Open position not found");
    const quote = getQuote(pos.symbol);
    if (!quote) throw new ApiError(503, "No live quote available to close this position");

    const closePrice = pos.side === "BUY" ? quote.bid : quote.ask; // opposite side of entry
    const closed = await this.realizePositionClose(pos, closePrice, volume, "MANUAL_CLOSE");
    if (!closed) throw new ApiError(409, "Position was modified or closed concurrently");
  }

  // ---- internal helpers -------------------------------------------------

  private async fillOrder(orderId: string, fillPrice: number) {
    const orderRes = await pool.query(
      `SELECT o.*, i.symbol, i.contract_size FROM orders o JOIN instruments i ON i.id = o.instrument_id WHERE o.id = ?`,
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) return;
    const instrument = getInstrumentById(order.instrument_id)!;

    const didFill = await withTransaction(async (client) => {
      const claim = await client.query(
        `UPDATE orders SET status = 'FILLED', executed_at = now()
         WHERE id = ? AND (status = 'OPEN' OR (status = 'FILLED' AND type = 'MARKET' AND executed_at IS NULL))`,
        [orderId]
      );
      if (claim.rowCount !== 1) return false;

      await client.query(
        `INSERT INTO order_executions (order_id, fill_price, fill_volume) VALUES (?,?,?)`,
        [orderId, fillPrice, order.volume]
      );

      const accRes = await client.query(`SELECT leverage FROM trading_accounts WHERE id = ?`, [
        order.trading_account_id,
      ]);
      if (!accRes.rows[0]) throw new Error("Trading account not found while filling order");
      const leverage = Math.min(accRes.rows[0].leverage, instrument.maxLeverage);
      const margin = calcRequiredMargin(instrument, Number(order.volume), fillPrice, leverage);

      await client.query(
        `INSERT INTO positions (trading_account_id, instrument_id, opening_order_id, side, volume, entry_price, stop_loss, take_profit, margin_reserved)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          order.trading_account_id,
          order.instrument_id,
          orderId,
          order.side,
          order.volume,
          fillPrice,
          order.stop_loss,
          order.take_profit,
          margin,
        ]
      );
      const balanceUpdate = await client.query(
        `UPDATE balances SET used_margin = used_margin + ?, updated_at = now() WHERE trading_account_id = ?`,
        [margin, order.trading_account_id]
      );
      if (balanceUpdate.rowCount !== 1) throw new Error("Balances not found while filling order");
      return true;
    });
    if (!didFill) return;

    const userId = await this.userIdForAccount(order.trading_account_id);
    this.hub.sendToUser(userId, "order.filled", { orderId, symbol: order.symbol, fillPrice });
    this.hub.sendToUser(userId, "position.opened", { symbol: order.symbol, side: order.side, volume: Number(order.volume) });
    await this.pushNotification(userId, "ORDER_FILLED", `${order.side} ${order.volume} ${order.symbol} filled at ${fillPrice}`);
  }

  private async realizePositionClose(
    pos: any,
    closePrice: number,
    volume: number | undefined,
    reason: "MANUAL_CLOSE" | "STOP_LOSS" | "TAKE_PROFIT" | "STOP_OUT"
  ): Promise<boolean> {
    const instrument = getInstrumentById(pos.instrument_id)!;
    const closeVolume = volume && volume < Number(pos.volume) ? volume : Number(pos.volume);
    const isPartial = closeVolume < Number(pos.volume);

    const direction = pos.side === "BUY" ? 1 : -1;
    const pnl = direction * (closePrice - Number(pos.entry_price)) * closeVolume * instrument.contractSize;
    const marginReleased = (Number(pos.margin_reserved) * closeVolume) / Number(pos.volume);

    const closed = await withTransaction(async (client) => {
      let positionUpdated: boolean;
      if (isPartial) {
        const positionUpdate = await client.query(
          `UPDATE positions SET volume = volume - ?, margin_reserved = margin_reserved - ?
           WHERE id = ? AND status = 'OPEN' AND volume = ? AND margin_reserved = ?`,
          [closeVolume, marginReleased, pos.id, pos.volume, pos.margin_reserved]
        );
        positionUpdated = positionUpdate.rowCount === 1;
      } else {
        const positionUpdate = await client.query(
          `UPDATE positions SET status = 'CLOSED', closed_at = now(), realized_pnl = ?
           WHERE id = ? AND status = 'OPEN' AND volume = ? AND margin_reserved = ?`,
          [pnl, pos.id, pos.volume, pos.margin_reserved]
        );
        positionUpdated = positionUpdate.rowCount === 1;
      }
      if (!positionUpdated) return false;

      const balanceUpdate = await client.query(
        `UPDATE balances SET cash_balance = cash_balance + ?, used_margin = used_margin - ?, updated_at = now()
         WHERE trading_account_id = ?`,
        [pnl, marginReleased, pos.trading_account_id]
      );
      if (balanceUpdate.rowCount !== 1) throw new Error("Balances not found while closing position");
      await client.query(
        `INSERT INTO transactions (trading_account_id, type, amount, reference_id, description)
         VALUES (?, 'REALIZED_PNL', ?, ?, ?)`,
        [pos.trading_account_id, pnl, pos.id, `${reason} ${pos.symbol} ${pos.side} ${closeVolume}`]
      );
      return true;
    });
    if (!closed) return false;

    const userId = await this.userIdForAccount(pos.trading_account_id);
    this.hub.sendToUser(userId, "position.closed", { positionId: pos.id, symbol: pos.symbol, pnl, reason });
    this.hub.sendToUser(userId, "balance.updated", {});
    const label = reason === "STOP_LOSS" ? "Stop Loss" : reason === "TAKE_PROFIT" ? "Take Profit" : reason === "STOP_OUT" ? "Stop Out" : "Position closed";
    await this.pushNotification(
      userId,
      reason === "STOP_LOSS" ? "SL_TRIGGERED" : reason === "TAKE_PROFIT" ? "TP_TRIGGERED" : "POSITION_CLOSED",
      `${label}: ${pos.symbol} ${pos.side} ${closeVolume} @ ${closePrice.toFixed(5)} (P/L ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)})`
    );
    return true;
  }

  /** Called on every quote tick: triggers pending LIMIT/STOP orders and SL/TP/stop-out on open positions for that instrument. */
  async onQuoteTick(symbol: string) {
    const quote = getQuote(symbol);
    if (!quote) return;
    const instrument = getInstrumentBySymbol(symbol);
    if (!instrument) return;

    // Pending LIMIT/STOP/STOP_LIMIT orders
    const pending = await pool.query(
      `SELECT * FROM orders WHERE instrument_id = ? AND status = 'OPEN'`,
      [instrument.id]
    );
    for (const order of pending.rows) {
      const triggerPrice = this.checkTrigger(order, quote);
      if (triggerPrice !== null) {
        await this.fillOrder(order.id, triggerPrice);
      }
    }

    // Open positions: SL/TP
    const openPositions = await pool.query(
      `SELECT * FROM positions WHERE instrument_id = ? AND status = 'OPEN'`,
      [instrument.id]
    );
    for (const pos of openPositions.rows) {
      const bidAsk = pos.side === "BUY" ? quote.bid : quote.ask; // price a BUY position would close at (sell side) / vice versa
      if (pos.stop_loss) {
        const hit = pos.side === "BUY" ? bidAsk <= Number(pos.stop_loss) : bidAsk >= Number(pos.stop_loss);
        if (hit) {
          await this.realizePositionClose(
            { ...pos, symbol },
            Number(pos.stop_loss),
            undefined,
            "STOP_LOSS"
          );
          continue;
        }
      }
      if (pos.take_profit) {
        const hit = pos.side === "BUY" ? bidAsk >= Number(pos.take_profit) : bidAsk <= Number(pos.take_profit);
        if (hit) {
          await this.realizePositionClose(
            { ...pos, symbol },
            Number(pos.take_profit),
            undefined,
            "TAKE_PROFIT"
          );
        }
      }
    }
  }

  private checkTrigger(order: any, quote: { bid: number; ask: number }): number | null {
    const price = order.side === "BUY" ? quote.ask : quote.bid;
    if (order.type === "LIMIT") {
      const lp = Number(order.limit_price);
      if (order.side === "BUY" && price <= lp) return lp;
      if (order.side === "SELL" && price >= lp) return lp;
    }
    if (order.type === "STOP" || order.type === "STOP_LIMIT") {
      const sp = Number(order.stop_price);
      if (order.side === "BUY" && price >= sp) return order.type === "STOP" ? sp : Number(order.limit_price ?? sp);
      if (order.side === "SELL" && price <= sp) return order.type === "STOP" ? sp : Number(order.limit_price ?? sp);
    }
    return null;
  }

  private async sumUnrealizedPnl(tradingAccountId: string): Promise<number> {
    const res = await pool.query(
      `SELECT p.*, i.symbol FROM positions p JOIN instruments i ON i.id = p.instrument_id
       WHERE p.trading_account_id = ? AND p.status = 'OPEN'`,
      [tradingAccountId]
    );
    let total = 0;
    for (const row of res.rows) {
      const instrument = getInstrumentById(row.instrument_id);
      const quote = getQuote(row.symbol);
      if (!instrument || !quote) continue;
      const currentPrice = row.side === "BUY" ? quote.bid : quote.ask;
      total += calcUnrealizedPnl({
        instrument,
        side: row.side,
        volume: Number(row.volume),
        entryPrice: Number(row.entry_price),
        currentPrice,
      });
    }
    return total;
  }

  private mapPositionRow(row: any) {
    const instrument = getInstrumentById(row.instrument_id);
    const quote = getQuote(row.symbol);
    const currentPrice = quote ? (row.side === "BUY" ? quote.bid : quote.ask) : null;
    const unrealizedPnl =
      instrument && quote
        ? calcUnrealizedPnl({
            instrument,
            side: row.side,
            volume: Number(row.volume),
            entryPrice: Number(row.entry_price),
            currentPrice: currentPrice!,
          })
        : null;
    return {
      id: row.id,
      symbol: row.symbol,
      side: row.side as OrderSide,
      volume: Number(row.volume),
      entryPrice: Number(row.entry_price),
      currentPrice,
      stopLoss: row.stop_loss ? Number(row.stop_loss) : null,
      takeProfit: row.take_profit ? Number(row.take_profit) : null,
      swap: Number(row.swap_accrued),
      unrealizedPnl,
      openedAt: row.opened_at,
    };
  }

  private async userIdForAccount(tradingAccountId: string): Promise<string> {
    const res = await pool.query(`SELECT user_id FROM trading_accounts WHERE id = ?`, [tradingAccountId]);
    return res.rows[0]?.user_id;
  }

  private async pushNotification(userId: string, type: string, body: string) {
    if (!userId) return;
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES (?,?,?,?)`,
      [userId, type, type.replace(/_/g, " "), body]
    );
    this.hub.sendToUser(userId, "notification.created", { type, body });
  }
}

export type OrderTypeInput = OrderType;
