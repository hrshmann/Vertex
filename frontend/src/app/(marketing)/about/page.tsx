import { PageHeader } from "@/components/PageHeader";

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About Vertex Trading"
        subtitle="A professional trading platform built around transparent execution and real-time market data."
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-3">What we're building</h2>
          <p className="vx-muted leading-relaxed">
            Vertex Trading is a trading terminal and broker-style website: a Next.js/TypeScript
            frontend, a Node.js API and WebSocket gateway, and a PostgreSQL-backed order management
            system. Crypto pricing streams live from a public exchange feed; forex pricing is served
            as an indicative reference rate until a licensed real-time forex data provider is
            connected — both are labeled accordingly everywhere they appear.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-3">Platform technology</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              ["Frontend", "React / Next.js, TypeScript, Tailwind CSS, responsive dark & light themes."],
              ["Backend", "Node.js REST API, WebSocket gateway, PostgreSQL, JWT-based auth."],
              ["Market data", "Live WebSocket feeds with no fabricated prices — every quote carries its source and timestamp."],
              ["Order engine", "A provider-abstraction order-management layer, ready to connect to an authorized broker/exchange."],
            ].map(([t, d]) => (
              <div key={t} className="vx-surface rounded-xl p-5">
                <div className="font-medium mb-1">{t}</div>
                <p className="text-sm vx-muted leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-3">Our services</h2>
          <ul className="list-disc list-inside vx-muted space-y-1.5 leading-relaxed">
            <li>Forex and crypto market access through a single account</li>
            <li>A demo account with simulated fills, clearly marked as such</li>
            <li>Configurable Standard, Pro and VIP account tiers</li>
            <li>Education resources covering trading fundamentals and risk management</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
