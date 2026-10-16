"use client";

import { useRouter } from "next/navigation";
import { CandlestickChart, Radio, ShieldCheck } from "lucide-react";
import { useMarkets } from "@/lib/useMarkets";
import { useAuth } from "@/lib/AuthContext";
import { ButtonLink } from "@/components/ui/Button";
import { Heatmap } from "@/components/markets/Heatmap";
import { MarketPulse } from "@/components/markets/MarketPulse";
import { MarketTable } from "@/components/markets/MarketTable";
import { Movers } from "@/components/markets/Movers";
import { HeroLine } from "@/components/markets/HeroLine";
import { CountUp } from "@/components/motion/CountUp";
import { Magnetic } from "@/components/motion/Magnetic";
import { Reveal } from "@/components/motion/Reveal";
import { Scramble } from "@/components/motion/Scramble";
import { SplitWords } from "@/components/motion/SplitWords";

const POINTS = [
  {
    icon: Radio,
    title: "Straight from the source",
    body: "Crypto prices come from Coinbase and forex rates from Kraken, several times a second. Every price shows where it came from and when.",
  },
  {
    icon: CandlestickChart,
    title: "Charts for every market",
    body: "Candlestick charts with volume, from one minute to one month, updating live as new prices arrive.",
  },
  {
    icon: ShieldCheck,
    title: "Verified accounts",
    body: "Open an account and verify your identity in a few minutes. Your documents are encrypted and only seen by our compliance team.",
  },
];

export default function HomePage() {
  const { rows, loading } = useMarkets();
  const { user } = useAuth();
  const router = useRouter();
  const open = (symbol: string) => router.push(`/markets?symbol=${encodeURIComponent(symbol)}`);
  const crypto = rows.filter((r) => r.class === "CRYPTO").length;
  const forex = rows.filter((r) => r.class === "FOREX").length;

  return (
    <div className="mx-auto max-w-[1680px] space-y-3 px-3 pb-4 pt-6 sm:px-4 lg:px-6 lg:pt-8">
      <section className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
        <div className="relative isolate flex flex-col justify-center py-4 lg:py-10 lg:pl-2">
          {/* Bitcoin's last 24 hours, drawing itself above the headline. */}
          <HeroLine className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[4.5rem] lg:block" />
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-buy/30 bg-buy/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-buy">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-buy" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-buy" />
            </span>
            <Scramble text={rows.length ? `${rows.length} markets live` : "Markets are live"} />
          </p>
          <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-tight md:text-[3.5rem]">
            <SplitWords text="Crypto and forex prices," />{" "}
            <SplitWords text="the moment they move." start={4} wordClassName="bg-gradient-to-r from-accent to-glow bg-clip-text text-transparent" />
          </h1>
          <p className="vx-page-in mt-5 max-w-xl text-base leading-relaxed text-muted [animation-delay:600ms]">
            {crypto || 71} cryptocurrencies and {forex || 44} currency pairs, streamed in real time with charts, movers and a market heatmap.
            Free to watch, no account needed.
          </p>
          <div className="vx-page-in mt-7 flex flex-wrap gap-3 [animation-delay:750ms]">
            <Magnetic>
              <ButtonLink href="/markets" size="lg">
                Open the live terminal
              </ButtonLink>
            </Magnetic>
            <Magnetic>
              {user ? (
                <ButtonLink href="/dashboard" size="lg" variant="secondary">
                  Go to dashboard
                </ButtonLink>
              ) : (
                <ButtonLink href="/register" size="lg" variant="secondary">
                  Open an account
                </ButtonLink>
              )}
            </Magnetic>
          </div>
          <dl className="vx-panel vx-page-in mt-8 grid max-w-lg grid-cols-3 divide-x divide-line rounded-panel [animation-delay:900ms]">
            <div className="px-4 py-3">
              <dt className="vx-caption">Markets</dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold">
                <CountUp value={rows.length || null} />
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="vx-caption">Updates</dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold">2/s</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="vx-caption">Timeframes</dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold">1m–1M</dd>
            </div>
          </dl>
        </div>

        <Reveal delay={250} className="h-[34rem] lg:h-[38rem]">
          <section aria-label="Live prices" className="vx-panel flex h-full flex-col overflow-hidden rounded-panel">
            <MarketTable rows={rows} loading={loading} onSelect={open} className="flex-1" />
          </section>
        </Reveal>
      </section>

      <Reveal>
        <MarketPulse rows={rows} onSelect={open} />
      </Reveal>
      <Reveal>
        <Movers rows={rows} onSelect={open} />
      </Reveal>
      <Reveal>
        <Heatmap rows={rows} onSelect={open} />
      </Reveal>

      <Reveal className="grid gap-3 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} style={{ "--i": i } as React.CSSProperties} className="vx-panel vx-cascade-slide rounded-panel p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent/10">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </Reveal>
    </div>
  );
}
