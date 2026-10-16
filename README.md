# Vertex Trading

A live crypto and forex price website: real-time prices and charts (public), client accounts
with identity verification (KYC) and email, and an admin panel for reviewing verifications.
Next.js/TypeScript frontend, Node.js/Express API + WebSocket gateway, MariaDB. There is no
trading: nothing is bought or sold and no client money is held.

To go live on Hostinger, follow [HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md), the
step-by-step launch guide. The root `package.json` and `app.js` are Hostinger's build script and
entry file: one app serves the website and API together on one address.

## Project layout

```
database/backend/ Node.js API, WebSocket gateway, market-data clients, email
frontend/     Next.js site (live prices, client portal) + admin panel
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
  interbank or broker liquidity. EUR/USD, GBP/USD, USD/CHF, USD/CAD, AUD/USD, EUR/GBP, EUR/CHF,
  EUR/CAD and EUR/AUD are covered. The other pairs (JPY pairs are too thin on Kraken; crosses,
  NZD and emerging-market currencies aren't listed) use the daily ECB rate, derived from one
  USD-based table, and are marked "Daily" in the UI. Live pairs also get intraday candles from
  Kraken; daily-rate pairs only have `1D` candles.

### Listed markets

The market list lives in `database/backend/src/services/marketData/instrumentCatalog.ts`: 71
coins (each must trade as BASE-USD on Coinbase and BASEUSDT on Binance) and 44 forex pairs (both
currencies must be published by the ECB). At startup the server adds any catalog market missing
from the `instruments` table, so listing a market is a code change and a deploy, with no
migration. Sparklines for the market list are fetched server-side every 5 minutes
(`sparklines.ts`, served at `GET /api/markets/sparklines`). Coin logos are in
`frontend/public/coins/`; coins without one get a generated badge.
- Every forex quote stays `isIndicative: true` end-to-end (API, WebSocket events, UI).

### Upgrading forex to broker-grade prices

For interbank or broker pricing on all pairs (including USD/JPY and NZD/USD), connect a forex data
or broker API with a key. For example, an OANDA practice (demo) account gives streaming bid/ask
for all majors, and [Twelve Data](https://twelvedata.com/) has a free tier. Add a client next to
`krakenForexClient.ts`, read the key from an env var, and make it the forex primary in
`feeds.ts`. The quote cache, WebSocket broadcast and charts need no changes; they're written
against the `Quote`/`Instrument` abstractions, not the provider.

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

Visit `http://localhost:3000/markets` — crypto prices should be live within a few seconds. Admin panel: `http://localhost:3000/admin/login`, using the
credentials from `npm run seed:admin`.

### Docker Compose (all services)

```powershell
cp .env.example .env   # replace the local-only MariaDB password placeholders
docker compose up --build
```

The Compose backend starts the API only; migrations remain a separate manual command and are
never run automatically on application startup.

## What's not built yet

- **Trading and payments** were removed on purpose: the site shows prices only and holds no
  client money. The old tables (`orders`, `positions`, `deposits`, ...) are left in the database
  untouched.
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
