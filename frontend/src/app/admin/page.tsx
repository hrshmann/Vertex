"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageTitle } from "@/components/ui/Panel";

interface Stats {
  totalClients: number;
  newClients7d: number;
  suspendedClients: number;
  verified: number;
  awaitingReview: number;
  waitingOnClient: number;
  declined: number;
  emailsSent7d: number;
  emailsFailed7d: number;
  liveMarkets: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get<Stats>("/api/admin/dashboard/stats").then(setStats).catch(() => setError(true));
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <PageTitle title="Dashboard" />
      {error && <p className="mb-4 text-sm text-sell">The figures couldn't be loaded. Refresh to try again.</p>}

      {stats && stats.awaitingReview > 0 && (
        <Link
          href="/admin/kyc"
          className="mb-6 flex items-center justify-between gap-4 rounded-panel border border-accent/30 bg-accent-soft px-5 py-4 hover:border-accent"
        >
          <span className="text-sm font-medium">
            {stats.awaitingReview} {stats.awaitingReview === 1 ? "verification is" : "verifications are"} waiting for review
          </span>
          <span className="text-sm font-medium text-accent">Review now</span>
        </Link>
      )}

      <h2 className="mb-3 text-sm font-semibold">Clients</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="All clients" value={stats?.totalClients} href="/admin/users" />
        <Figure label="New in the last 7 days" value={stats?.newClients7d} />
        <Figure label="Suspended" value={stats?.suspendedClients} />
      </dl>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Verification</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Waiting for review" value={stats?.awaitingReview} tone={stats?.awaitingReview ? "accent" : undefined} href="/admin/kyc" />
        <Figure label="Waiting on the client" value={stats?.waitingOnClient} />
        <Figure label="Verified" value={stats?.verified} tone="buy" />
        <Figure label="Declined" value={stats?.declined} />
      </dl>

      <h2 className="mb-3 mt-8 text-sm font-semibold">System</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Markets with live prices" value={stats ? `${stats.liveMarkets} of 12` : undefined} tone={stats && stats.liveMarkets < 12 ? "warn" : "buy"} />
        <Figure label="Emails sent, last 7 days" value={stats?.emailsSent7d} />
        <Figure label="Emails not sent, last 7 days" value={stats?.emailsFailed7d} tone={stats?.emailsFailed7d ? "sell" : undefined} />
      </dl>
    </div>
  );
}

function Figure({ label, value, tone, href }: { label: string; value?: string | number; tone?: "buy" | "sell" | "warn" | "accent"; href?: string }) {
  const body = (
    <>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={clsx(
          "mt-1.5 text-xl font-semibold vx-tabular",
          tone === "buy" && "text-buy",
          tone === "sell" && "text-sell",
          tone === "warn" && "text-warn",
          tone === "accent" && "text-accent"
        )}
      >
        {value ?? "—"}
      </dd>
    </>
  );
  const className = "block rounded-panel border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={clsx(className, "hover:border-accent")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
