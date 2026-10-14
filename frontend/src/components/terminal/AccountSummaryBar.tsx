"use client";

import Link from "next/link";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { Account } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

const RISK_LABEL: Record<Account["riskState"], string> = {
  NORMAL: "Normal",
  MARGIN_WARNING: "Margin Warning",
  MARGIN_CALL: "Margin Call",
  STOP_OUT: "Stop Out",
};
const RISK_COLOR: Record<Account["riskState"], string> = {
  NORMAL: "text-vx-buy",
  MARGIN_WARNING: "text-vx-warn",
  MARGIN_CALL: "text-vx-sell",
  STOP_OUT: "text-vx-sell",
};

export function AccountSummaryBar({ account }: { account: Account | null }) {
  const { user, logout } = useAuth();

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-[rgb(var(--border))] vx-surface shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="hidden sm:inline">Vertex</span>
        </Link>
        <span className="px-2 py-1 rounded-md bg-vx-warn/15 text-vx-warn text-[11px] font-semibold uppercase tracking-wide">
          Demo Account
        </span>
      </div>

      <div className="hidden md:flex items-center gap-6 text-xs vx-tabular">
        <Metric label="Balance" value={account ? `$${account.balance.toFixed(2)}` : "—"} />
        <Metric label="Equity" value={account ? `$${account.equity.toFixed(2)}` : "—"} />
        <Metric label="Used Margin" value={account ? `$${account.usedMargin.toFixed(2)}` : "—"} />
        <Metric label="Free Margin" value={account ? `$${account.freeMargin.toFixed(2)}` : "—"} />
        <Metric
          label="Unrealized P/L"
          value={account ? `${account.unrealizedPnl >= 0 ? "+" : ""}${account.unrealizedPnl.toFixed(2)}` : "—"}
          valueClass={account ? (account.unrealizedPnl >= 0 ? "text-vx-buy" : "text-vx-sell") : undefined}
        />
        <Metric
          label="Margin Level"
          value={account?.marginLevel != null ? `${account.marginLevel.toFixed(0)}%` : "—"}
        />
        <span className={clsx("font-semibold", account ? RISK_COLOR[account.riskState] : "vx-muted")}>
          {account ? RISK_LABEL[account.riskState] : ""}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Link href="/account" className="vx-muted hover:text-[rgb(var(--text))] hidden sm:inline">
          {user?.first_name}
        </Link>
        <Link href="/" className="vx-muted hover:text-[rgb(var(--text))] hidden sm:inline">
          Site
        </Link>
        <button onClick={() => logout()} className="vx-muted hover:text-[rgb(var(--text))]">
          Log out
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="text-center">
      <div className="vx-muted">{label}</div>
      <div className={clsx("font-medium", valueClass)}>{value}</div>
    </div>
  );
}
