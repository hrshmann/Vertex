"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/useAccount";
import { useMarkets } from "@/lib/useMarkets";
import { AccountSummaryBar } from "@/components/terminal/AccountSummaryBar";
import { Watchlist } from "@/components/terminal/Watchlist";
import { ChartPanel } from "@/components/terminal/ChartPanel";
import { OrderPanel } from "@/components/terminal/OrderPanel";
import { BottomPanel } from "@/components/terminal/BottomPanel";

function TerminalInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account, reload } = useAccount("DEMO");
  const { rows } = useMarkets();
  const [symbol, setSymbol] = useState(searchParams.get("symbol") ?? "BTC/USD");
  const [mobileTab, setMobileTab] = useState<"watchlist" | "chart" | "order" | "positions">("chart");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/terminal");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="h-screen flex items-center justify-center vx-muted">Loading terminal…</div>;
  }

  const instrument = rows.find((r) => r.symbol === symbol);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AccountSummaryBar account={account} />

      {/* Desktop: 4-pane layout. Mobile: tabbed single pane. */}
      <div className="flex-1 min-h-0 hidden md:flex">
        <div className="w-60 border-r border-[rgb(var(--border))] shrink-0">
          <Watchlist selected={symbol} onSelect={setSymbol} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <ChartPanel symbol={symbol} />
          </div>
          <div className="h-56 border-t border-[rgb(var(--border))] shrink-0">
            <BottomPanel />
          </div>
        </div>
        <div className="w-80 border-l border-[rgb(var(--border))] shrink-0 overflow-y-auto">
          <OrderPanel instrument={instrument} account={account} onOrderPlaced={reload} />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex md:hidden flex-col">
        {mobileTab === "watchlist" && <Watchlist selected={symbol} onSelect={(s) => { setSymbol(s); setMobileTab("chart"); }} />}
        {mobileTab === "chart" && <ChartPanel symbol={symbol} />}
        {mobileTab === "order" && <OrderPanel instrument={instrument} account={account} onOrderPlaced={reload} />}
        {mobileTab === "positions" && <BottomPanel />}
      </div>

      <nav className="md:hidden grid grid-cols-4 border-t border-[rgb(var(--border))] vx-surface shrink-0">
        {(["watchlist", "chart", "order", "positions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`py-3 text-xs capitalize ${mobileTab === t ? "text-vx-accent" : "vx-muted"}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center vx-muted">Loading terminal…</div>}>
      <TerminalInner />
    </Suspense>
  );
}
