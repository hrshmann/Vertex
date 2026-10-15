# Vertex Trading

A forex & crypto trading broker website and web trading terminal: Next.js/TypeScript frontend,
Node.js/Express API + WebSocket gateway, MariaDB. This is the MVP core of the full spec in
`docs/original-spec.md` — the main site, auth, live markets, a demo trading terminal with a real
order-matching/risk engine, KYC upload, deposits/withdrawals, and a basic admin panel. See
"What's not built yet" below for what's intentionally out of scope for this pass.

To go live on Hostinger, follow [HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md), the
step-by-step launch guide. The root `package.json` and `app.js` are Hostinger's build script and
entry file: one app serves the website and API together on one address.

## Project layout

```
database/backend/ Node.js API, WebSocket gateway, market-data clients, demo trading engine
frontend/     Next.js site + trading terminal + admin panel
database/     SQL migrations (run in filename order)
docker-compose.yml
```

## Market data providers

No market-data or broker API credentials were supplied, so prices come from **free, keyless**
public feeds. Each asset class has a primary feed and a fallback. The fallback publishes a symbol
only while the primary has no current quote for it, so the two sources don't alternate on a
healthy connection. The wiring is in `database/backend/src/services/marketData/feeds.ts`.

| Asset class | Primary feed | Fallback feed |
| --- | --- | --- |
| Crypto | **Coinbase Exchange** `ticker` channel (`coinbaseClient.ts`). Real USD order books, updated on every trade with the best bid/ask. | **Binance** 24h ticker (`binanceClient.ts`). Quoted in USDT, converted to USD at Coinbase's live USDT-USD rate. |
| Forex | **Kraken** v2 `ticker` channel (`krakenForexClient.ts`). Live traded fiat markets, updated on every top-of-book change. Quotes wider than 10 bps are rejected as illiquid. | **Frankfurter** (`forexClient.ts`). ECB daily reference rates with a small illustrative spread. |

What this means today:

- **Crypto** prices are real exchange data in real USD (`isIndicative: false`). Chart history
  comes from Binance klines, scaled to USD at the live USDT-USD rate.
- **Forex** quotes from Kraken are live but come from a crypto exchange's fiat markets, not
  interbank or broker liquidity. EUR/USD, GBP/USD, USD/CHF, USD/CAD and AUD/USD are covered.
  USD/JPY (too thin on Kraken) and NZD/USD (not listed) use the daily ECB rate. Live pairs also
  get intraday candles from Kraken; daily-rate pairs only have `1D` candles.
- Every forex quote stays `isIndicative: true` end-to-end (API, WebSocket events, UI). Every
  forex instrument is seeded `is_executable: false`, so forex orders can't be placed: the order
  engine only fills executable instruments.

### Upgrading forex to broker-grade prices

For interbank or broker pricing on all pairs (including USD/JPY and NZD/USD), connect a forex data
or broker API with a key. For example, an OANDA practice (demo) account gives streaming bid/ask
for all majors, and [Twelve Data](https://twelvedata.com/) has a free tier. Add a client next to
`krakenForexClient.ts`, read the key from an env var, and make it the forex primary in
`feeds.ts`. Set `is_executable = true` on the forex rows in `instruments` only when you're ready
to let users trade against that feed. The quote cache, WebSocket broadcast, chart, order panel
and demo engine need no changes. They're written against the `Quote`/`Instrument`
abstractions, not the provider.

## Order execution — demo only

The order engine (`database/backend/src/services/trading/demoEngine.ts`) implements the `TradingProvider`
interface (`database/backend/src/types.ts`) against the live/indicative quote cache: Market/Limit/Stop/
Stop-Limit orders, Stop Loss/Take Profit auto-close, server-side margin and risk calculation
(margin warning/call/stop-out), all for a **DEMO account only**. No LIVE provider is implemented —
that would mean calling an authorized broker or exchange's official API with real credentials,
and none were supplied. `LIVE` mode is rejected by the API with a clear error until a real adapter
is written and registered the same way `DemoTradingEngine` is in `database/backend/src/index.ts`.

## Getting started

### 1. Database

```bash
docker compose up -d mariadb redis
cd database/backend
cp .env.example .env     # fill in MariaDB connection details and real secrets
npm install
npm run migrate
npm run seed:admin        # ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin
```

To develop against the Hostinger database, set `DB_HOST` (the `*.hstgr.io` host from hPanel),
`DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` in `database/backend/.env`, and allow your IP
under hPanel → Databases → Remote MySQL. The deployed API uses `DB_HOST=localhost` instead. Enable
`DB_SSL=true` if the host requires TLS. Do not copy local Docker credentials to a hosted database.

### 2. Backend

```bash
cd database/backend
npm run dev                # http://localhost:4000, WS at /ws
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Visit `http://localhost:3000`, register an account, and open the terminal — crypto prices should
be live within a few seconds. Admin panel: `http://localhost:3000/admin/login`, using the
credentials from `npm run seed:admin`.

### Docker Compose (all services)

```powershell
cp .env.example .env   # replace the local-only MariaDB password placeholders
docker compose up --build
```

The Compose backend starts the API only; migrations remain a separate manual command and are
never run automatically on application startup.

## What's not built yet

Deliberately out of scope for this MVP pass (flagged rather than faked):

- **LIVE trading / broker-exchange adapters** — needs real, authorized broker/exchange API
  credentials and documentation, which weren't supplied.
- **Payment provider integration** — deposits/withdrawals are recorded with the correct status
  flow (`PENDING` → ...), but nothing calls a real payment gateway; demo deposits settle
  instantly as play money, and nothing is ever auto-marked `COMPLETED` for a LIVE account without
  a provider confirming it.
- **Email/SMS delivery** — no transactional delivery provider is configured, so verification and
  password-reset instructions cannot be delivered. Password-reset requests are acknowledged
  without claiming that a link was sent.
- **Full 2FA (TOTP) enrollment UI**, object storage for KYC documents (the upload endpoint exists
  and validates files, but stores a placeholder key — point `storage_key` at real private object
  storage before launch), chart indicators/drawing tools, CSV/PDF export, and the remaining
  compliance/legal page content (seeded as explicit placeholders — see
  `database/migrations/003_seed_compliance.sql`).
- **Admin UI for `api_connections`** — the table (encrypted-at-rest via
  `database/backend/src/utils/crypto.ts`) and schema exist for admin-configured exchange/broker API keys,
  but there's no admin screen to manage them yet, since the current feeds (Coinbase, Binance,
  Kraken, Frankfurter) are public and keyless.

## Known dev-dependency advisory

`npm audit` in `frontend/` reports a high-severity advisory in `braces` (via `chokidar` →
`tailwindcss@3`), a build-time-only dependency with no production runtime exposure. Fixing it
requires migrating to Tailwind CSS v4's config format, which was left out of this pass as a
separate, larger piece of work. The frontend's actual runtime dependencies (Next.js, React) are
on current patched versions.

## Original spec

The full, untrimmed request this project was built from is kept at `docs/original-spec.md` for
reference.
