# Vertex Trading

A forex & crypto trading broker website and web trading terminal: Next.js/TypeScript frontend,
Node.js/Express API + WebSocket gateway, MariaDB. This is the MVP core of the full spec in
`docs/original-spec.md` — the main site, auth, live markets, a demo trading terminal with a real
order-matching/risk engine, KYC upload, deposits/withdrawals, and a basic admin panel. See
"What's not built yet" below for what's intentionally out of scope for this pass.

For Hostinger deployment configuration, app roots, environment variables, and plan requirements,
see [HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md). The exact capabilities of the paid
Hostinger plan must be confirmed in hPanel before deployment.

## Project layout

```
database/backend/ Node.js API, WebSocket gateway, market-data clients, demo trading engine
frontend/     Next.js site + trading terminal + admin panel
database/     SQL migrations (run in filename order)
docker-compose.yml
```

## Market data providers

No market-data or broker API credentials were supplied, so this MVP uses two **free, keyless**
sources and is explicit everywhere about what kind of data they are:

- **Crypto — Binance public market data** (`database/backend/src/services/marketData/binanceClient.ts`).
  Live best bid/ask, last price, 24h high/low/volume/change over Binance's public WebSocket
  ticker stream. No API key needed. This is real, executable-grade exchange data
  (`isExecutable: true`, `isIndicative: false` on every quote).

- **Forex — Frankfurter.app** (`database/backend/src/services/marketData/forexClient.ts`). Free, keyless,
  ECB daily reference rates. There is no bid/ask or intraday movement in this feed — it's one
  published rate per business day — so the client polls it and synthesizes a small illustrative
  spread purely for display. Every forex quote is marked `isIndicative: true` end-to-end (API,
  WebSocket events, UI), every forex instrument is seeded `is_executable: false`, and forex order
  placement is accordingly not available (the order engine only fills executable instruments).

### Upgrading the forex feed to real-time

To get live, executable forex pricing, connect a real-time forex data or broker API. A free tier
that fits with minimal changes: **[Twelve Data](https://twelvedata.com/)** (free API key, REST +
WebSocket, covers forex). Steps:

1. Sign up for a free API key at twelvedata.com.
2. Replace the contents of `forexClient.ts` with a client against Twelve Data's `/price` or
   WebSocket quote endpoint, using the key via an env var (add `TWELVE_DATA_API_KEY` to
   `database/backend/.env`).
3. Set `is_executable = true` and update `provider`/`provider_symbol` on the forex rows in
   `instruments` (see `database/migrations/002_seed_instruments.sql`) once you're actually ready
   to let users place forex orders against that feed.
4. The rest of the system (quote cache, WS broadcast, chart, order panel, demo engine) needs no
   changes — they're all written against the `Quote`/`Instrument` abstractions, not the provider.

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

For Hostinger, set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in
`database/backend/.env` using the database details from hPanel. Enable `DB_SSL=true` if the host requires
TLS. Do not copy local Docker credentials to a hosted database.

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
  but there's no admin screen to manage them yet, since the current feeds (Binance, Frankfurter)
  are public and keyless.

## Known dev-dependency advisory

`npm audit` in `frontend/` reports a high-severity advisory in `braces` (via `chokidar` →
`tailwindcss@3`), a build-time-only dependency with no production runtime exposure. Fixing it
requires migrating to Tailwind CSS v4's config format, which was left out of this pass as a
separate, larger piece of work. The frontend's actual runtime dependencies (Next.js, React) are
on current patched versions.

## Original spec

The full, untrimmed request this project was built from is kept at `docs/original-spec.md` for
reference.
