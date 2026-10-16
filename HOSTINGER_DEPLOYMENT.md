# Going live on Hostinger

Vertex Trading runs as **one Hostinger Node.js web app** on one address, `yourdomain.com`:

| Setting | Value |
| --- | --- |
| Domain | `yourdomain.com` |
| Build command | `build` |
| Entry file | `app.js` |
| Env file to import | `.env.hostinger` |

`app.js` starts the API and attaches the Next.js website to it. The API answers `/api/...`,
`/health` and the `/ws` WebSocket, and every other path is a website page. No `api.` subdomain
is needed. Login cookies stay on your own domain, and there is no cross-site setup to get wrong.

Hostinger's Node.js apps have no root-directory or start-command setting. They run an npm script
from the repository's root `package.json` and start an entry file from the repository root. The
root `package.json` and `app.js` exist for exactly this. `npm run build` builds
`database/backend/` and then `frontend/`.

The database is already set up on Hostinger. It runs MariaDB 11.8 and all migrations are
applied, so no database step is needed beyond creating your admin account.

## Before you start

- **Plan:** Node.js web apps are available on **Business** web hosting and **Cloud** plans. You
  need one free web-app slot. VPS plans don't have this panel.
- **Domain:** `yourdomain.com` should be on your Hostinger account, with its DNS pointing to
  Hostinger. If a website already exists on that domain in hPanel, remove it first, because a
  Node.js app can't be added to a domain that already has a site.
- **Code on GitHub:** Hostinger deploys from the GitHub repository, from the `main` branch by
  default. Push all changes first.

## Step 1 — Generate the environment file (on your PC)

From the repository root:

```sh
npm run hostinger:env -- --domain yourdomain.com
```

This writes `.env.hostinger` (git-ignored) in the repository root. It contains:

- `NODE_ENV=production` and `DB_HOST=localhost`;
- your database login, read from `database/backend/.env`, and `DB_CONNECTION_LIMIT=5`;
- new random JWT secrets and encryption key;
- `CORS_ORIGIN` for `https://yourdomain.com` and `https://www.yourdomain.com`, and
  `TRUST_PROXY_HOPS=1`.

No `NEXT_PUBLIC_*` variables are needed: the website calls the API on its own address.

**Back the file up somewhere private.** Running the command again keeps the existing secrets.
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

## Step 3 — Deploy the app

1. In hPanel, go to **Websites → Add Website → Node.js Web App → Import Git repository**.
2. Click **Connect with GitHub**, install the Hostinger GitHub App, and allow it access to
   `hrshmann/Vertex`. Then pick that repository.
3. Choose the domain **`yourdomain.com`**.
4. Fill in the build settings:
   - **Framework preset:** Other
   - **Branch:** `main`
   - **Node.js version:** 22
   - **Build command:** `build`. If the field wants a full command, use `npm run build`.
   - **Entry file:** `app.js`
   - **Output directory:** leave empty
   - **Environment variables:** **Import from .env file** → `.env.hostinger`
5. Click **Deploy** and watch the build log. It compiles the backend (`tsc`), then builds the
   website (`next build`). It can take a few minutes.
6. In **Runtime Logs**, you should see:
   ```text
   [instruments] loaded 115 instruments
   [vertex-trading-backend] listening on configured port (production)
   [vertex-trading-backend] serving the website on the same address
   [coinbase] connected
   [kraken] connected
   ```
   `[kraken] not subscribed: Currency pair not supported NZD/USD` is expected.

If `www.yourdomain.com` isn't covered automatically, add it as an alias or redirect it to
`yourdomain.com` in hPanel.

## Step 4 — HTTPS

Make sure SSL is active for `yourdomain.com` and `www.yourdomain.com` (**hPanel → Security →
SSL**; Hostinger usually issues these automatically). Login cookies are HTTPS-only in production,
so logging in won't work until SSL is active.

## Step 5 — Check the live site

1. Open `https://yourdomain.com/health/ready`. You should see:
   ```json
   { "ok": true, "database": "ok", "quotes": 12,
     "quoteSources": { "coinbase": 5, "kraken": 5, "frankfurter": 2 }, "clientIp": "<your IP>" }
   ```
   - `database` should be `ok`. If it isn't, see Troubleshooting below.
   - `clientIp` should equal your public IP (search "what is my IP"). If it shows another
     address, the API is seeing Hostinger's proxy instead of visitors. Every visitor would then
     share one rate limit, and the site would start returning "Rate limit exceeded" under normal
     traffic. Raise `TRUST_PROXY_HOPS` by 1 in the app's environment variables, redeploy, and
     check again. Use the lowest value that shows your IP.
2. Open `https://yourdomain.com`. The markets on the home page and `/markets` should show live
   prices that move.
3. **WebSocket check:** in the browser's developer tools, go to **Network → WS** and reload. A
   `/ws` connection with status `101` means live streaming works. If WebSockets aren't available
   on your plan, prices still refresh every 3 seconds automatically. Nothing breaks.
4. Open `/markets` and check the prices move. Register an account and start verification.
5. Log in at `https://yourdomain.com/admin/login` with the admin account from step 2.

## Step 6 — Turn on email

The site sends welcome emails, verification decision emails (approved, more information
needed, declined) and password reset links. Until email is set up, admins can still open each
decision email in their own mail app, and the forgot-password page points clients to support.

1. In hPanel, go to **Emails** and create a mailbox on your domain, for example
   `support@yourdomain.com`. Choose a strong password.
2. In hPanel, open the Node.js app → **Environment variables** and add:

   | Name | Value |
   | --- | --- |
   | `SMTP_USER` | the mailbox address, e.g. `support@yourdomain.com` |
   | `SMTP_PASS` | the mailbox password |

   That's all: the app uses Hostinger's mail server (`smtp.hostinger.com`, port 465) by default.
   Optional: `MAIL_FROM` (defaults to `SMTP_USER`) and `MAIL_FROM_NAME` (defaults to
   `Vertex Trading`).
3. Redeploy (or restart the app). Then check: on `/forgot-password`, request a link for your own
   account. It should arrive within a minute. Check the spam folder the first time.

Every email is recorded on the client's verification review page, with whether it was sent.

## Updating the site later

Push to `main`. Hostinger rebuilds and redeploys automatically. Never change the JWT secrets or
`ENCRYPTION_KEY` in production unless you mean to log everyone out.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Hostinger's "This Page Does Not Exist" or a PHP "Default page" | The domain has an ordinary website, not the Node.js app. Remove that website in **Websites**, then repeat step 3. |
| Hostinger says a subdomain isn't owned by you | Not needed anymore: everything runs on the main domain. |
| `503 Service Unavailable` | The app isn't running. Check **Deployments** for a failed build and **Runtime Logs** for a startup error. |
| Runtime log: `[fatal] cannot connect to database ... (ECONNREFUSED)` or `ETIMEDOUT` | Wrong host. Use `DB_HOST=localhost` on Hostinger. |
| Runtime log: `... (ER_ACCESS_DENIED_ERROR)` | Wrong `DB_USER`, `DB_PASSWORD` or `DB_NAME`. Compare them with hPanel → Databases. |
| Runtime log: `ER_TOO_MANY_USER_CONNECTIONS` or `ER_USER_LIMIT_REACHED` | The database user is limited to 500 new connections per hour. Keep `DB_CONNECTION_LIMIT=5` and wait for the hour to reset. |
| Runtime log: `Missing required environment variable: ...` | The env file wasn't imported, or a value is empty. Re-import `.env.hostinger`. |
| Runtime log: `Cannot find module ... required-server-files.json` or `dist/server.js` | The build didn't finish. The build command must be `build`, not `build:api` or `build:web`. |
| Login succeeds but you're logged straight out | SSL isn't active yet. See step 4. |
| Everyone gets "Rate limit exceeded" | `TRUST_PROXY_HOPS` is too low. See the `clientIp` check in step 5. |
| Emails don't arrive, and the review page shows "Not sent ... The mail server didn't accept the email" | Wrong `SMTP_USER`/`SMTP_PASS`, or the mailbox doesn't exist. Log in to webmail with the same details to check. |
| Emails land in spam | In hPanel → **Emails**, check that the domain's SPF, DKIM and DMARC records are set up (hPanel shows a warning if any are missing). |
| No crypto prices | Look for `[coinbase] connected` in the runtime log. Binance takes over automatically if Coinbase is unreachable. Binance is blocked in some regions, including the US. |

## Reference

**Database facts (checked 2026-10-15):** MariaDB 11.8, `utf8mb4_unicode_ci`. `001_init.sql`,
`002_seed_instruments.sql`, `003_seed_compliance.sql`, `004_kyc_document_storage.sql` and
`005_email.sql` are recorded in `schema_migrations`.
The database user is capped at `MAX_CONNECTIONS_PER_HOUR 500`, and the server's `wait_timeout`
is 20 seconds. The pool closes idle connections after `DB_IDLE_TIMEOUT_MS` (default 15000). Keep
that below `wait_timeout`.

**Migrations** never run on startup. Run a future migration only as a deliberate, backed-up
maintenance step, from your PC (`cd database/backend && npm run migrate`).

**Optional variables:** `DB_SSL`, `DB_IDLE_TIMEOUT_MS`, `JWT_ACCESS_TTL` (default `15m`),
`JWT_REFRESH_TTL_DAYS` (default `7`) and `JWT_ADMIN_TTL` (default `8h`). Feed addresses are
`COINBASE_WS_BASE`, `KRAKEN_WS_BASE`, `KRAKEN_REST_BASE`, `BINANCE_WS_BASE`,
`BINANCE_REST_BASE`, `FOREX_INDICATIVE_BASE` and `FOREX_POLL_INTERVAL_MS`. Their defaults are
correct; leave them unset. The app needs outbound access to `ws-feed.exchange.coinbase.com`,
`ws.kraken.com`, `api.kraken.com`, `stream.binance.com:9443`, `api.binance.com` and
`api.frankfurter.dev`. `NEXT_PUBLIC_MARKET_POLL_INTERVAL_MS` (default `10000`) sets the resync
interval while the WebSocket is connected; it's a build-time value, so redeploy after changing it.

**Separate API host (optional):** to run the website and API on different addresses instead, set
`NEXT_PUBLIC_API_URL` (and optionally `NEXT_PUBLIC_WS_URL`) at build time. The website then calls
that origin, and `CORS_ORIGIN` on the API must list the website's origin.

## Product limitations to resolve before a public launch

- The site shows prices only: there is no trading and no deposits or withdrawals.
- Email needs a mailbox (step 6) before welcome, decision and password reset emails are sent.
- Legal pages show placeholder text (`database/migrations/003_seed_compliance.sql`). Replace it
  with text for your licensed entity and jurisdiction.
- Forex prices are indicative only. Pairs Kraken doesn't quote liquidly (USD/JPY, NZD/USD, the
  crosses and emerging-market pairs) use the daily ECB rate (see `README.md`).
