"use client";

import Link from "next/link";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { Account } from "@/lib/types";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { NotificationsMenu, ThemeToggle, UserMenu } from "@/components/portal/HeaderMenus";

const RISK: Record<Account["riskState"], { label: string; className: string }> = {
  NORMAL: { label: "Healthy", className: "text-buy" },
  MARGIN_WARNING: { label: "Margin warning", className: "text-warn" },
  MARGIN_CALL: { label: "Margin call", className: "text-sell" },
  STOP_OUT: { label: "Stop out", className: "text-sell" },
};

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/funds", label: "Funds" },
  { href: "/kyc", label: "Verification" },
  { href: "/history", label: "History" },
];

export function AccountSummaryBar({ account }: { account: Account | null }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" aria-label="Vertex Trading overview">
          <Logo className="h-6 w-6" />
        </Link>
        <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-2xs font-medium text-warn">Demo</span>
        <nav aria-label="Portal" className="hidden items-center gap-1 xl:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-control px-2.5 py-1.5 text-xs text-muted hover:bg-raised hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="hidden min-w-0 items-center gap-5 font-condensed md:flex">
        <Metric label="Balance" value={account ? formatMoney(account.balance) : "—"} />
        <Metric label="Equity" value={account ? formatMoney(account.equity) : "—"} />
        <Metric label="Free margin" value={account ? formatMoney(account.freeMargin) : "—"} />
        <Metric
          label="Open P/L"
          value={account ? formatSignedMoney(account.unrealizedPnl) : "—"}
          className={account ? (account.unrealizedPnl > 0 ? "text-buy" : account.unrealizedPnl < 0 ? "text-sell" : "") : undefined}
        />
        <Metric
          label="Margin level"
          value={account?.marginLevel != null ? `${account.marginLevel.toFixed(0)}%` : "—"}
          className={account ? RISK[account.riskState].className : undefined}
          title={account ? RISK[account.riskState].label : undefined}
        />
      </dl>

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}

function Metric({ label, value, className, title }: { label: string; value: string; className?: string; title?: string }) {
  return (
    <div className="text-right" title={title}>
      <dt className="text-2xs text-muted">{label}</dt>
      <dd className={clsx("text-sm font-semibold vx-tabular", className)}>{value}</dd>
    </div>
  );
}
