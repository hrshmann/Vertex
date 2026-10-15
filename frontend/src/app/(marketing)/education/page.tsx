import { PageHeader } from "@/components/PageHeader";

const SECTIONS = [
  {
    title: "Forex basics",
    body: "Currencies are traded in pairs. When you buy EUR/USD, you're buying euros and simultaneously selling US dollars, betting the euro strengthens against the dollar.",
  },
  {
    title: "Crypto basics",
    body: "Cryptocurrencies trade 24/7 on global exchanges with no central market close. Prices can move sharply on news, liquidity shifts and broader market sentiment.",
  },
  {
    title: "Technical analysis",
    body: "Reading price charts — trends, support/resistance levels and indicators like moving averages or RSI — to inform entry and exit decisions.",
  },
  {
    title: "Risk management",
    body: "Position sizing, stop losses and leverage control are what keep a single bad trade from doing lasting damage to an account.",
  },
  {
    title: "Trading psychology",
    body: "Discipline and a written plan matter as much as analysis — most trading mistakes come from emotional decisions, not a lack of market knowledge.",
  },
  {
    title: "Trading strategies",
    body: "From trend-following to range trading, a strategy defines concrete, repeatable rules for when to enter and exit — rather than reacting trade by trade.",
  },
];

export default function EducationPage() {
  return (
    <div>
      <PageHeader title="Education" subtitle="Core concepts for anyone starting out in forex or crypto trading." />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        {SECTIONS.map((s) => (
          <div key={s.title} className="vx-surface rounded-xl p-6">
            <h2 className="font-semibold mb-2">{s.title}</h2>
            <p className="text-sm vx-muted leading-relaxed">{s.body}</p>
          </div>
        ))}
        <div className="rounded-xl border border-vx-warn/30 bg-vx-warn/5 p-6 text-sm leading-relaxed">
          Trading leveraged financial products and cryptocurrencies involves significant risk and may not be
          suitable for all investors. You may lose some or all of your invested capital. Please consider your
          financial circumstances and risk tolerance before trading.
        </div>
      </div>
    </div>
  );
}
