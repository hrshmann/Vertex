import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About Vertex Trading" subtitle="Live crypto and forex prices, shown clearly and honestly." />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">What we do</h2>
          <p className="leading-relaxed text-muted">
            Vertex Trading shows real-time prices and charts for major cryptocurrencies and currency pairs. Anyone can follow the{" "}
            <Link href="/markets" className="text-accent hover:underline">
              live prices
            </Link>
            . Clients open an account and verify their identity with us.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            We don't execute trades or hold client money. Prices are for information only.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Where the prices come from</h2>
          <ul className="space-y-2 leading-relaxed text-muted">
            <li>
              <span className="font-medium text-ink">Crypto:</span> Coinbase, in US dollars, with Binance as a backup if Coinbase can't be
              reached.
            </li>
            <li>
              <span className="font-medium text-ink">Forex:</span> Kraken, updated several times a second. USD/JPY and NZD/USD use the
              European Central Bank's daily reference rate.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-muted">Every price on the site shows its source and how recently it was updated.</p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Your data</h2>
          <p className="leading-relaxed text-muted">
            Identity documents are encrypted before they're stored and can only be opened by our compliance team. Every time a document is
            viewed, it's recorded.
          </p>
        </section>
      </div>
    </div>
  );
}
