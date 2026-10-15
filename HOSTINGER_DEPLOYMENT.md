# Going live on Hostinger

Vertex Trading runs as **two Hostinger Node.js web apps built from this one repository**:

| App | Domain | Build command | Entry file | Env file to import |
| --- | --- | --- | --- | --- |
| API | `api.yourdomain.com` | `build:api` | `api.js` | `.env.hostinger-api` |
| Website | `yourdomain.com` (+ `www`) | `build:web` | `web.js` | `.env.hostinger-web` |

Hostinger's Node.js apps have no root-directory or start-command setting. They run an npm script
from the repository's root `package.json` and start an entry file from the repository root. The
root `package.json`, `api.js` and `web.js` exist for exactly this. They build and start
`database/backend/` and `frontend/`.

The database is already set up on Hostinger. It runs MariaDB 11.8 and all migrations are
applied, so no database step is needed beyond creating your admin account.

## Before you start

- **Plan:** Node.js web apps are available on **Business** web hosting and **Cloud** plans. You
  need two free web-app slots. VPS plans don't have this panel.
- **Domain:** `yourdomain.com` should be on your Hostinger account, with its DNS pointing to
  Hostinger. If a website already exists on that domain in hPanel, remove it first, because a
  Node.js app can't be added to a domain that already has a site.
- **Code on GitHub:** Hostinger deploys from the GitHub repository, from the `main` branch by
  default. Push all changes first.

## Step 1 — Generate the environment files (on your PC)

From the repository root:

```sh
npm run hostinger:env -- --domain yourdomain.com
```

This writes two git-ignored files in the repository root:

- `.env.hostinger-api` contains `NODE_ENV=production`, `DB_HOST=localhost`, your database login
  (read from `database/backend/.env`), `DB_CONNECTION_LIMIT=5`, and new random JWT secrets and
  encryption key. It also sets `CORS_ORIGIN` for `https://yourdomain.com` and
  `https://www.yourdomain.com`, and `TRUST_PROXY_HOPS=1`.
- `.env.hostinger-web` contains `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` and
  `NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws`.

**Back both files up somewhere private.** Running the command again keeps the existing secrets.
Pass `--rotate` only if a secret has leaked: it logs every user out and makes stored encrypted
values unreadable.

## Step 2 — Create your admin account (on your PC)

Your PC's IP already has Remote MySQL access to the database. In `database/backend/.env`, set:

```sh
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<at least 12 characters, upper and lower case, a number>
```

Then run:

```sh
cd database/backend
npm run seed:admin
```

It prints `[seed:admin] admin ready`. **Then delete the `ADMIN_PASSWORD` value from the file.**
Running the command again with the same email resets that admin's password.

## Step 3 — Deploy the API

1. In hPanel, go to **Websites → Add Website → Node.js Web App → Import Git repository**.
2. Click **Connect with GitHub**, install the Hostinger GitHub App, and allow it access to
   `hrshmann/Vertex`. Then pick that repository.
3. When asked for the domain, **type `api.yourdomain.com`**. This creates the subdomain as its own
   website. **Don't** create it first under **Domains → Subdomains**: that makes an empty PHP site
   ("Default page") that blocks the Node.js app. If that already happened, delete that website
   (or the subdomain) and start this step again.
4. Fill in the build settings:
   - **Framework preset:** Other (or Express)
   - **Branch:** `main`
   - **Node.js version:** 22
   - **Build command:** `build:api`. If the field wants a full command, use `npm run build:api`.
   - **Entry file:** `api.js`
   - **Output directory:** leave empty
   - **Environment variables:** **Import from .env file** → `.env.hostinger-api`
5. Click **Deploy** and watch the build log. It ends with the backend compiling (`tsc`).
6. In **Runtime Logs**, you should see:
   ```text
   [instruments] loaded 12 instruments
   [vertex-trading-backend] listening on configured port (production)
   [coinbase] connected
   [kraken] connected
   ```
   `[kraken] not subscribed: Currency pair not supported NZD/USD` is expected.

**Check it:** open `https://api.yourdomain.com/health/ready`. You should see:

```json
{ "ok": true, "database": "ok", "quotes": 12,
  "quoteSources": { "coinbase": 5, "kraken": 5, "frankfurter": 2 }, "clientIp": "<your IP>" }
```

- `database` should be `ok`. If it isn't, see Troubleshooting below.
- `clientIp` should equal your public IP (search "what is my IP"). If it shows another address,
  the API is seeing the proxy instead of visitors. Every visitor would then share one rate limit,
  and the site would start returning "Rate limit exceeded" under normal traffic. Raise
  `TRUST_PROXY_HOPS` by 1 in the app's environment variables, redeploy, and check again. Use the
  lowest value that shows your IP.

## Step 4 — Deploy the website

Repeat step 3 with these differences:

- **Domain:** `yourdomain.com`. Add `www.yourdomain.com` as an alias, or redirect it to the main
  domain.
- **Build command:** `build:web` (or `npm run build:web`)
- **Entry file:** `web.js`
- **Environment variables:** import `.env.hostinger-web`

The `NEXT_PUBLIC_*` values are built into the website's code. After changing them, **redeploy**:
a restart alone doesn't pick them up. The build fails on purpose if `NEXT_PUBLIC_API_URL` is
missing or isn't HTTPS.

## Step 5 — HTTPS

Make sure SSL is active for `yourdomain.com`, `www.yourdomain.com` and `api.yourdomain.com`
(**hPanel → Security → SSL**; Hostinger usually issues these automatically). Login cookies are
HTTPS-only in production, so logging in won't work until SSL is active.

## Step 6 — Check the live site

1. Open `https://yourdomain.com`. The markets on the home page and `/markets` should show live
   prices that move.
2. **WebSocket check:** in the browser's developer tools, go to **Network → WS** and reload. A
   `/ws` connection with status `101` means live streaming works. If WebSockets aren't
   available, prices still refresh every 3 seconds automatically. Nothing breaks.
3. Register an account, place a small demo BTC trade in `/terminal`, then close it.
4. Log in at `https://yourdomain.com/admin/login` with the admin account from step 2.

## Updating the site later

Push to `main`. Hostinger rebuilds and redeploys both apps automatically. Never change the JWT
secrets or `ENCRYPTION_KEY` in production unless you mean to log everyone out.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| API log: `[fatal] cannot connect to database ... (ECONNREFUSED)` or `ETIMEDOUT` | Wrong host. Use `DB_HOST=localhost` on Hostinger. |
| API log: `... (ER_ACCESS_DENIED_ERROR)` | Wrong `DB_USER`, `DB_PASSWORD` or `DB_NAME`. Compare them with hPanel → Databases. |
| API log: `ER_TOO_MANY_USER_CONNECTIONS` or `ER_USER_LIMIT_REACHED` | The database user is limited to 500 new connections per hour. Keep `DB_CONNECTION_LIMIT=5` and wait for the hour to reset. |
| API log: `Missing required environment variable: ...` | The env file wasn't imported, or a value is empty. Re-import `.env.hostinger-api`. |
| Website build fails: `NEXT_PUBLIC_API_URL must ...` | Import `.env.hostinger-web` into the website app and redeploy. |
| Browser console shows a CORS error | `CORS_ORIGIN` must exactly match the address in the browser bar (`https://`, no trailing slash). The generator includes both the plain and `www` addresses. |
| Login succeeds but you're logged straight out | SSL isn't active on `api.` yet, or the site and API aren't on the same domain. |
| Everyone gets "Rate limit exceeded" | `TRUST_PROXY_HOPS` is too low. See the `clientIp` check in step 3. |
| App says "unresponsive" | It must listen on Hostinger's `PORT`. Both entry files do, so check the runtime log for a startup error. |
| No crypto prices | Look for `[coinbase] connected` in the API log. Binance takes over automatically if Coinbase is unreachable. Binance is blocked in some regions, including the US. |

## Reference

**Database facts (checked 2026-10-15):** MariaDB 11.8, `utf8mb4_unicode_ci`. `001_init.sql`,
`002_seed_instruments.sql` and `003_seed_compliance.sql` are recorded in `schema_migrations`.
The database user is capped at `MAX_CONNECTIONS_PER_HOUR 500`, and the server's `wait_timeout`
is 20 seconds. The pool closes idle connections after `DB_IDLE_TIMEOUT_MS` (default 15000). Keep
that below `wait_timeout`.

**Migrations** never run on startup. Run a future migration only as a deliberate, backed-up
maintenance step, from your PC (`cd database/backend && npm run migrate`).

**Optional API variables:** `DB_SSL`, `DB_IDLE_TIMEOUT_MS`, `JWT_ACCESS_TTL` (default `15m`),
`JWT_REFRESH_TTL_DAYS` (default `7`) and `JWT_ADMIN_TTL` (default `8h`). Feed addresses are
`COINBASE_WS_BASE`, `KRAKEN_WS_BASE`, `KRAKEN_REST_BASE`, `BINANCE_WS_BASE`,
`BINANCE_REST_BASE`, `FOREX_INDICATIVE_BASE` and `FOREX_POLL_INTERVAL_MS`. Their defaults are
correct; leave them unset. The API needs outbound access to `ws-feed.exchange.coinbase.com`,
`ws.kraken.com`, `api.kraken.com`, `stream.binance.com:9443`, `api.binance.com` and
`api.frankfurter.dev`.

**Optional website variable:** `NEXT_PUBLIC_MARKET_POLL_INTERVAL_MS` (default `10000`), the
resync interval while the WebSocket is connected.

## Product limitations to resolve before a public launch

- Trading is demo-only. Live broker or exchange execution isn't implemented.
- Deposits and withdrawals have no real payment provider.
- Email isn't configured, so password reset can't send anything.
- KYC uploads are recorded but not stored. Set up private file storage before accepting real
  documents.
- Legal pages show placeholder text (`database/migrations/003_seed_compliance.sql`). Replace it
  with text for your licensed entity and jurisdiction.
- Forex prices are indicative only. USD/JPY and NZD/USD use the daily ECB rate (see `README.md`).
