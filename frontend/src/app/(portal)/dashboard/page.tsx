"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Bell, Check, Circle, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useMarkets } from "@/lib/useMarkets";
import { useKyc, useNotifications } from "@/lib/usePortalData";
import { formatDateTime, timeAgo } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { MarketPulse } from "@/components/markets/MarketPulse";
import { MarketTable } from "@/components/markets/MarketTable";
import { Movers } from "@/components/markets/Movers";
import { Reveal } from "@/components/motion/Reveal";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { rows, loading } = useMarkets();
  const router = useRouter();
  const open = (symbol: string) => router.push(`/prices?symbol=${encodeURIComponent(symbol)}`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {greeting()}
            {user?.first_name ? `, ${user.first_name}` : ""}
          </h1>
          <p className="text-xs text-muted">Your account and the markets at a glance.</p>
        </div>
        <ButtonLink href="/prices" size="sm" variant="secondary">
          Open the live terminal
        </ButtonLink>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <VerificationCard />
        <RecentNotifications />
      </div>
      <MarketPulse rows={rows} onSelect={open} />

      <section aria-label="Watchlist" className="vx-panel flex max-h-[34rem] flex-col overflow-hidden rounded-panel">
        <MarketTable rows={rows} loading={loading} onSelect={open} initialFilter="WATCH" className="flex-1" />
      </section>

      <Reveal>
        <Movers rows={rows} onSelect={open} />
      </Reveal>
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
      className={clsx("rounded-panel border p-5 sm:p-6", needsChanges ? "border-warn/40 bg-warn-soft" : "vx-panel")}
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
  const recent = notifications.slice(0, 3);
  return (
    <Panel title="Notifications" className="lg:max-h-[16rem] lg:overflow-y-auto" bodyClassName="">
      {!loaded ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="Nothing yet"
          body="Verification updates and security alerts appear here."
          className="!py-5"
        />
      ) : (
        <ul>
          {recent.map((n) => (
            <li key={n.id} className="border-b border-line px-5 py-2.5 last:border-0">
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
