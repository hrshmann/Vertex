"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ArrowDownToLine, CandlestickChart, Receipt } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/useAccount";
import { usePositions } from "@/lib/usePositions";
import { useMarkets } from "@/lib/useMarkets";
import { api } from "@/lib/api";
import { Transaction } from "@/lib/types";
import { formatDateTime, formatMoney, formatSignedMoney, priceDecimals } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Figure, Panel } from "@/components/ui/Panel";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { PriceFlash } from "@/components/PriceFlash";
import { OnboardingTrack } from "@/components/portal/OnboardingTrack";

const RISK: Record<string, { label: string; className: string }> = {
  NORMAL: { label: "Healthy", className: "text-buy" },
  MARGIN_WARNING: { label: "Margin warning", className: "text-warn" },
  MARGIN_CALL: { label: "Margin call", className: "text-sell" },
  STOP_OUT: { label: "Stop out", className: "text-sell" },
};

const TRANSACTION_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  REALIZED_PNL: "Closed trade",
  ADJUSTMENT: "Adjustment",
  FEE: "Fee",
  COMMISSION: "Commission",
  SWAP: "Swap",
};

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { account } = useAccount("DEMO");
  const { positions } = usePositions();
  const { rows } = useMarkets();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  useEffect(() => {
    api.get<Transaction[]>("/api/account/transactions?mode=DEMO&limit=6").then(setTransactions).catch(() => setTransactions([]));
  }, []);

  const watch = ["BTC/USD", "ETH/USD", "EUR/USD", "GBP/USD", "SOL/USD", "USD/JPY"]
    .map((s) => rows.find((r) => r.symbol === s))
    .filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {greeting()}, {user?.first_name}
          </h1>
          <p className="mt-1 text-sm text-muted">Here's where your demo account stands.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/funds" variant="secondary">
            <ArrowDownToLine className="h-4 w-4" />
            Add funds
          </ButtonLink>
          <ButtonLink href="/terminal">
            <CandlestickChart className="h-4 w-4" />
            Trade
          </ButtonLink>
        </div>
      </div>

      <OnboardingTrack />

      <Panel className="mb-6" bodyClassName="p-5">
        {account ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            <Figure label="Equity" value={formatMoney(account.equity)} sub="Balance plus open profit and loss" />
            <Figure label="Balance" value={formatMoney(account.balance)} />
            <Figure label="Free margin" value={formatMoney(account.freeMargin)} sub="Available for new trades" />
            <Figure
              label="Open P/L"
              value={formatSignedMoney(account.unrealizedPnl)}
              tone={account.unrealizedPnl > 0 ? "buy" : account.unrealizedPnl < 0 ? "sell" : undefined}
            />
            <Figure
              label="Margin level"
              value={account.marginLevel != null ? `${account.marginLevel.toFixed(0)}%` : "No open trades"}
              sub={<span className={RISK[account.riskState]?.className}>{RISK[account.riskState]?.label}</span>}
            />
          </dl>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel
            title={`Open positions${positions.length ? ` (${positions.length})` : ""}`}
            actions={positions.length > 0 && <ButtonLink href="/terminal" variant="ghost" size="sm">Manage in terminal</ButtonLink>}
            bodyClassName=""
          >
            {positions.length === 0 ? (
              <EmptyState
                icon={<CandlestickChart className="h-5 w-5" />}
                title="No open positions"
                body="Positions you open in the terminal show here with live profit and loss."
                action={<ButtonLink href="/terminal" size="sm">Open the terminal</ButtonLink>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr className="border-b border-line">
                      <th className="px-5 py-2.5 font-medium">Market</th>
                      <th className="px-3 py-2.5 font-medium">Side</th>
                      <th className="px-3 py-2.5 text-right font-medium">Size</th>
                      <th className="px-3 py-2.5 text-right font-medium">Entry</th>
                      <th className="px-3 py-2.5 text-right font-medium">Price</th>
                      <th className="px-5 py-2.5 text-right font-medium">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => {
                      const d = priceDecimals(p.symbol, p.entryPrice);
                      return (
                        <tr key={p.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3 font-medium">{p.symbol}</td>
                          <td className={clsx("px-3 py-3", p.side === "BUY" ? "text-buy" : "text-sell")}>{p.side === "BUY" ? "Buy" : "Sell"}</td>
                          <td className="px-3 py-3 text-right vx-tabular">{p.volume}</td>
                          <td className="px-3 py-3 text-right vx-tabular">{p.entryPrice.toFixed(d)}</td>
                          <td className="px-3 py-3 text-right">
                            <PriceFlash value={p.currentPrice} decimals={d} />
                          </td>
                          <td
                            className={clsx(
                              "px-5 py-3 text-right font-medium vx-tabular",
                              (p.unrealizedPnl ?? 0) > 0 ? "text-buy" : (p.unrealizedPnl ?? 0) < 0 ? "text-sell" : ""
                            )}
                          >
                            {formatSignedMoney(p.unrealizedPnl)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            title="Recent activity"
            actions={<ButtonLink href="/history" variant="ghost" size="sm">See all</ButtonLink>}
            bodyClassName=""
          >
            {transactions === null ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState icon={<Receipt className="h-5 w-5" />} title="No activity yet" body="Deposits, withdrawals and closed trades appear here." />
            ) : (
              <ul>
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{TRANSACTION_LABELS[t.type] ?? t.type}</p>
                      <p className="truncate text-xs text-muted">
                        {t.description ? `${t.description}, ` : ""}
                        {formatDateTime(t.created_at)}
                      </p>
                    </div>
                    <span className={clsx("shrink-0 text-sm font-medium vx-tabular", Number(t.amount) >= 0 ? "text-buy" : "text-sell")}>
                      {formatSignedMoney(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Markets" actions={<ButtonLink href="/markets" variant="ghost" size="sm">All markets</ButtonLink>} bodyClassName="">
          <ul>
            {watch.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="border-b border-line px-5 py-3 last:border-0">
                  <Skeleton className="h-5" />
                </li>
              ))}
            {watch.map((r) => {
              const q = r.quote;
              const change = q?.change24hPct ?? null;
              return (
                <li key={r.symbol} className="border-b border-line last:border-0">
                  <Link href={`/terminal?symbol=${encodeURIComponent(r.symbol)}`} className="flex items-center justify-between px-5 py-3 hover:bg-raised">
                    <div>
                      <p className="text-sm font-medium">{r.symbol}</p>
                      <p className="text-2xs text-muted">{r.class === "CRYPTO" ? "Crypto" : r.isExecutable ? "Forex" : "Forex, indicative"}</p>
                    </div>
                    <div className="text-right">
                      <PriceFlash value={q?.last} decimals={priceDecimals(r.symbol, q?.last)} className="text-sm font-medium" />
                      {change != null && (
                        <p className={clsx("text-2xs vx-tabular", change >= 0 ? "text-buy" : "text-sell")}>
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
