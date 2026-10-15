"use client";

import Link from "next/link";
import clsx from "clsx";
import { Bell, Check, Circle, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useMarkets } from "@/lib/useMarkets";
import { useKyc, useNotifications } from "@/lib/usePortalData";
import { formatDateTime, priceDecimals, timeAgo } from "@/lib/format";
import { instrumentName } from "@/lib/instruments";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { PriceFlash } from "@/components/PriceFlash";

const WATCH = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "GBP/USD", "USD/JPY"];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { rows } = useMarkets();
  const watch = WATCH.map((s) => rows.find((r) => r.symbol === s)).filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">
          {greeting()}
          {user?.first_name ? `, ${user.first_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">Your account and the markets at a glance.</p>
      </div>

      <VerificationCard />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          title="Live prices"
          actions={<ButtonLink href="/prices" variant="ghost" size="sm">All prices and charts</ButtonLink>}
          bodyClassName=""
        >
          <ul className="grid sm:grid-cols-2">
            {watch.length === 0 &&
              WATCH.map((s) => (
                <li key={s} className="border-b border-line px-5 py-3.5">
                  <Skeleton className="h-6" />
                </li>
              ))}
            {watch.map((r) => {
              const q = r.quote;
              const change = q?.change24hPct ?? null;
              return (
                <li key={r.symbol} className="border-b border-line sm:odd:border-r">
                  <Link href={`/prices?symbol=${encodeURIComponent(r.symbol)}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-raised">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.symbol}</p>
                      <p className="truncate text-2xs text-muted">{instrumentName(r.symbol)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <PriceFlash value={q?.last} decimals={priceDecimals(r.symbol, q?.last)} className="text-sm font-medium" />
                      <p className={clsx("text-2xs vx-tabular", change == null ? "text-muted" : change >= 0 ? "text-buy" : "text-sell")}>
                        {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <RecentNotifications />
      </div>
    </div>
  );
}

/** Where the client stands with identity verification, and what to do next. */
function VerificationCard() {
  const { kyc } = useKyc();
  if (!kyc) return <Skeleton className="h-28" />;

  if (kyc.status === "APPROVED") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-panel border border-buy/30 bg-buy-soft px-5 py-4">
        <ShieldCheck className="h-5 w-5 text-buy" aria-hidden />
        <p className="text-sm">
          <span className="font-medium">Your identity is verified.</span>{" "}
          <span className="text-muted">Verified {formatDateTime(kyc.reviewed_at)}.</span>
        </p>
      </div>
    );
  }

  if (kyc.status === "UNDER_REVIEW") {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-panel border border-accent/30 bg-accent-soft px-5 py-4">
        <Clock className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
        <div>
          <p className="text-sm font-medium">We're reviewing your documents</p>
          <p className="mt-0.5 text-xs text-muted">
            Submitted {formatDateTime(kyc.submitted_at)}. This usually takes one business day, and we'll email you when it's done.
          </p>
        </div>
      </div>
    );
  }

  const needsChanges = kyc.status === "ADDITIONAL_INFORMATION_REQUIRED" || kyc.status === "REJECTED";
  const items = [
    { done: kyc.requirements.identity, label: "Photo ID" },
    { done: kyc.requirements.proofOfAddress, label: "Proof of address" },
    { done: kyc.requirements.selfie, label: "Selfie" },
  ];
  const started = kyc.documents.length > 0;

  return (
    <section
      aria-labelledby="verify-title"
      className={clsx("rounded-panel border p-5 sm:p-6", needsChanges ? "border-warn/40 bg-warn-soft" : "border-line bg-surface")}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldAlert className={clsx("mt-0.5 h-5 w-5 shrink-0", needsChanges ? "text-warn" : "text-accent")} aria-hidden />
          <div className="min-w-0">
            <h2 id="verify-title" className="text-base font-semibold">
              {needsChanges ? "Your verification needs changes" : "Verify your identity"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {needsChanges && kyc.rejection_reason
                ? kyc.rejection_reason
                : "Complete your account by uploading three documents. It takes about 3 minutes."}
            </p>
          </div>
        </div>
        <ButtonLink href="/kyc">{needsChanges ? "Update documents" : started ? "Continue verification" : "Start verification"}</ButtonLink>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 pl-8">
        {items.map((item) => (
          <li key={item.label} className={clsx("flex items-center gap-2 text-sm", item.done ? "text-ink" : "text-muted")}>
            {item.done ? <Check className="h-4 w-4 text-buy" strokeWidth={3} aria-hidden /> : <Circle className="h-4 w-4 text-line" aria-hidden />}
            {item.label}
            <span className="sr-only">{item.done ? "(uploaded)" : "(not uploaded yet)"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentNotifications() {
  const { notifications, loaded } = useNotifications();
  const recent = notifications.slice(0, 5);
  return (
    <Panel title="Notifications" bodyClassName="">
      {!loaded ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </div>
      ) : recent.length === 0 ? (
        <EmptyState icon={<Bell className="h-5 w-5" />} title="Nothing yet" body="Verification updates and security alerts appear here." />
      ) : (
        <ul>
          {recent.map((n) => (
            <li key={n.id} className="border-b border-line px-5 py-3 last:border-0">
              <p className={clsx("text-sm", n.read_at ? "text-ink" : "font-medium text-ink")}>{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>}
              <p className="mt-1 text-2xs text-muted">{timeAgo(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
