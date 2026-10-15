import { PageHeader } from "@/components/PageHeader";

const SECTIONS = [
  {
    title: "How currency pairs are quoted",
    body: "A forex price compares two currencies. EUR/USD at 1.0850 means one euro costs 1.0850 US dollars. When the number goes up, the first currency has strengthened against the second.",
  },
  {
    title: "Bid, ask and spread",
    body: "The bid is the highest price buyers are offering right now; the ask is the lowest price sellers will accept. The gap between them is the spread. A narrow spread usually means a busy, liquid market.",
  },
  {
    title: "Why crypto never closes",
    body: "Cryptocurrencies are quoted around the clock, every day, on exchanges worldwide. Forex trades 24 hours on weekdays and pauses over the weekend, so forex prices stand still on Saturdays.",
  },
  {
    title: "Reading a candlestick chart",
    body: "Each candle covers one period, such as an hour. Its body runs from the opening to the closing price; the thin lines show the highest and lowest price in that period. Green candles closed higher than they opened, red ones lower.",
  },
  {
    title: "The 24-hour change",
    body: "The percentage next to each price compares it with the price 24 hours earlier. It's a quick way to see which markets are moving most today.",
  },
  {
    title: "Live and reference rates",
    body: "Most prices here update several times a second. A few forex pairs use the European Central Bank's daily reference rate instead, which changes once each working day. Each price is labelled so you know which is which.",
  },
];

export default function EducationPage() {
  return (
    <div>
      <PageHeader title="Learn" subtitle="What the numbers on a price screen mean." />
      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-2 lg:px-8">
        {SECTIONS.map((s) => (
          <section key={s.title} className="rounded-panel border border-line bg-surface p-6">
            <h2 className="mb-2 font-semibold">{s.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{s.body}</p>
          </section>
        ))}
        <p className="text-sm leading-relaxed text-muted md:col-span-2">
          Prices of cryptocurrencies and currencies can move sharply and without warning. Nothing on this site is financial advice.
        </p>
      </div>
    </div>
  );
}
