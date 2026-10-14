"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";

interface TierConfig {
  tier: "STANDARD" | "PRO" | "VIP";
  min_deposit: string;
  default_leverage: number;
  spread_markup_bps: number;
  commission_per_lot: string;
  description: string;
}

export default function AccountTypesPage() {
  const [tiers, setTiers] = useState<TierConfig[]>([]);

  useEffect(() => {
    api.get<TierConfig[]>("/api/account/tiers").then(setTiers).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title="Account Types"
        subtitle="Every figure below is configured by the operator in the admin panel, not hard-coded — these are the live values."
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <div
              key={t.tier}
              className={clsx(
                "vx-surface rounded-2xl p-7 flex flex-col",
                t.tier === "PRO" && "ring-1 ring-vx-accent"
              )}
            >
              {t.tier === "PRO" && (
                <span className="self-start mb-3 text-[10px] uppercase tracking-wide bg-vx-accent/15 text-vx-accent px-2 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <div className="text-lg font-semibold">{t.tier}</div>
              <p className="text-sm vx-muted mt-2 leading-relaxed min-h-[3rem]">{t.description}</p>
              <div className="mt-6 space-y-3 text-sm flex-1">
                <Row label="Minimum deposit" value={`$${Number(t.min_deposit).toLocaleString()}`} />
                <Row label="Leverage up to" value={`1:${t.default_leverage}`} />
                <Row
                  label="Spread markup"
                  value={t.spread_markup_bps === 0 ? "None (raw spread)" : `${t.spread_markup_bps} bps`}
                />
                <Row
                  label="Commission"
                  value={Number(t.commission_per_lot) === 0 ? "None" : `$${t.commission_per_lot} / lot`}
                />
              </div>
              <Link
                href="/register"
                className={clsx(
                  "mt-7 text-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  t.tier === "PRO" ? "bg-vx-accent text-white hover:bg-vx-accent/90" : "vx-surface-2 hover:bg-[rgb(var(--border))]"
                )}
              >
                Open {t.tier} account
              </Link>
            </div>
          ))}
          {tiers.length === 0 && (
            <div className="col-span-3 text-center vx-muted py-10">Loading account tiers…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="vx-muted">{label}</span>
      <span className="font-medium vx-tabular">{value}</span>
    </div>
  );
}
