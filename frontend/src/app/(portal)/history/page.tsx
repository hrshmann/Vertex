"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { CandlestickChart, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { useOrderHistory } from "@/lib/usePortalData";
import { Transaction } from "@/lib/types";
import { formatDateTime, formatSignedMoney } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";

const ORDER_TYPES: Record<string, string> = { MARKET: "Market", LIMIT: "Limit", STOP: "Stop", STOP_LIMIT: "Stop limit" };
const TRANSACTION_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  REALIZED_PNL: "Closed trade",
  ADJUSTMENT: "Adjustment",
  FEE: "Fee",
  COMMISSION: "Commission",
  SWAP: "Swap",
};

export default function HistoryPage() {
  const [tab, setTab] = useState<"orders" | "ledger">("orders");
  const { orders } = useOrderHistory();
  const [ledger, setLedger] = useState<Transaction[] | null>(null);

  useEffect(() => {
    api.get<Transaction[]>("/api/account/transactions?mode=DEMO&limit=200").then(setLedger).catch(() => setLedger([]));
  }, []);

  return (
    <div>
      <PageTitle title="History" description="Every order you've placed and every change to your balance." />
      <Panel
        title={
          <Tabs
            label="History view"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "orders", label: "Orders" },
              { value: "ledger", label: "Account activity" },
            ]}
          />
        }
        bodyClassName=""
      >
        {tab === "orders" ? <OrdersTable orders={orders} /> : <LedgerTable ledger={ledger} />}
      </Panel>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3 p-5">
      <Skeleton className="h-5" />
      <Skeleton className="h-5" />
      <Skeleton className="h-5" />
    </div>
  );
}

function OrdersTable({ orders }: { orders: ReturnType<typeof useOrderHistory>["orders"] }) {
  if (orders === null) return <Loading />;
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<CandlestickChart className="h-5 w-5" />}
        title="No orders yet"
        body="Orders you place in the terminal are listed here, including cancelled and pending ones."
        action={<ButtonLink href="/terminal" size="sm">Open the terminal</ButtonLink>}
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-line">
            <th className="px-5 py-2.5 font-medium">Market</th>
            <th className="px-3 py-2.5 font-medium">Side</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 text-right font-medium">Size</th>
            <th className="px-3 py-2.5 text-right font-medium">Price</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-5 py-2.5 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium">{o.symbol}</td>
              <td className={clsx("px-3 py-3", o.side === "BUY" ? "text-buy" : "text-sell")}>{o.side === "BUY" ? "Buy" : "Sell"}</td>
              <td className="px-3 py-3 text-muted">{ORDER_TYPES[o.type] ?? o.type}</td>
              <td className="px-3 py-3 text-right vx-tabular">{Number(o.volume)}</td>
              <td className="px-3 py-3 text-right vx-tabular text-muted">
                {o.limit_price ? Number(o.limit_price) : o.stop_price ? Number(o.stop_price) : "Market"}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-5 py-3 text-muted">{formatDateTime(o.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerTable({ ledger }: { ledger: Transaction[] | null }) {
  if (ledger === null) return <Loading />;
  if (ledger.length === 0) {
    return <EmptyState icon={<Receipt className="h-5 w-5" />} title="No account activity yet" body="Deposits, withdrawals and closed trades are recorded here." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-line">
            <th className="px-5 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Details</th>
            <th className="px-3 py-2.5 text-right font-medium">Amount</th>
            <th className="px-5 py-2.5 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((t) => (
            <tr key={t.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium">{TRANSACTION_LABELS[t.type] ?? t.type}</td>
              <td className="max-w-xs truncate px-3 py-3 text-muted">{t.description ?? ""}</td>
              <td className={clsx("px-3 py-3 text-right font-medium vx-tabular", Number(t.amount) >= 0 ? "text-buy" : "text-sell")}>
                {formatSignedMoney(t.amount)}
              </td>
              <td className="px-5 py-3 text-muted">{formatDateTime(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
