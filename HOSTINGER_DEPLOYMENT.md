# Hostinger deployment

The user confirmed that hPanel offers persistent **Node.js Web App** hosting. This deployment
uses one persistent Node app for the frontend and one for the API; confirm the plan's concurrent
app quota and outbound access to the existing MariaDB before creating them. The exact plan name,
account limits, and database network reachability have not been independently verified. Docker
is not required. WebSockets are optional; market quotes also refresh through REST polling.

If the current plan does not offer persistent Node.js web apps, this architecture will not run
on that plan. Use a Hostinger VPS (the lowest-cost Hostinger product that provides long-running
Node processes and reverse-proxy control) or upgrade to a plan that explicitly supports Node.js
web apps. Confirm current plan features and pricing in hPanel; they are account/product-specific.

## Application layout and deployment roots

Deploy the existing repository twice from the same codebase:

| App | Hostinger application root | Runtime |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js Node server |
| API | `database/backend/` | Express API, MariaDB pool, market-data clients |

### Hostinger Express app entry

For the API application, set the Hostinger application root/working directory to
`database/backend/`. Do not configure `server.js`: this backend is TypeScript and has no
source `server.js`. TypeScript compiles `src/index.ts` to `dist/index.js`, as specified by the
backend `tsconfig.json` and `package.json` `main`/`start` entries.

Use these API settings in Hostinger:

- Application type: **Express**
- Node.js version: **22**
- Build command: `npm ci && npm run build`
- Entry/start command: `node dist/index.js` (equivalently, `npm run start`)

The build creates `database/backend/dist/index.js` relative to the API root. Configure the
entry path relative to that root as `dist/index.js`, not `server.js`. The process reads the
platform-assigned `PORT` and the existing MariaDB connection from its environment. Starting
the compiled entry does not run migrations.

Keep `database/migrations/` in the repository for controlled, manual schema maintenance only.
The API startup command does **not** run migrations. This project already has an initialized
Hostinger schema; do not run migrations as part of this deployment.

Use Node.js 22 for the API. Set each app's build command to:

```sh
npm ci && npm run build
```

Set the API app's start command to:

```sh
npm run start
```

Set the frontend app's start command to:

```sh
node .next/standalone/server.js
```

Run each command with its app root as the working directory. The frontend build stages the
standalone server and its static/public assets automatically. The API listens on the assigned
`PORT` (falling back to 4000 only for local use); the frontend standalone server also honors
`PORT` (falling back to 3000 locally). Keep the Node processes managed by Hostinger; do not
start them from an SSH shell or a temporary background command.

## Domains, TLS, and cookies

Use one registrable domain for the site and API, for example:

- Frontend: `https://www.example.com` (or the apex domain)
- API: `https://api.example.com`

Point both DNS records to the destinations shown for their respective apps in hPanel and enable
Hostinger TLS certificates for both. Keeping the apps on the same registrable domain allows the
browser to send the API's secure, HTTP-only cookies on credentialed frontend requests. Do not
set a broad cookie domain; cookies remain scoped to the API host. Configure the exact frontend
origin in `CORS_ORIGIN`, with no path or trailing slash. Multiple allowed origins can be given
as a comma-separated list.

Set `TRUST_PROXY_HOPS` to the reverse-proxy hop count documented by Hostinger. The default in
production is `1`; do not increase it based on guesswork. The API marks auth cookies secure in
production and trusts forwarded HTTPS metadata only from the configured proxy chain.

## Environment variables

Configure these in Hostinger's private app environment settings, not in source control:

### API runtime (`database/backend/`)

Required:

- `NODE_ENV=production`
- `PORT` (use Hostinger's assigned value; usually injected by the platform)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ADMIN_SECRET`
- `ENCRYPTION_KEY`
- `CORS_ORIGIN`

Also configure:

- `TRUST_PROXY_HOPS` — the exact proxy hop count confirmed by Hostinger.
- `DB_SSL=true` if Hostinger requires TLS for connections to this MariaDB service.
- `DB_CONNECTION_LIMIT` if the plan has a documented per-app/database connection cap; otherwise
  the application default is 10.
- Optional feed configuration: `BINANCE_WS_BASE`, `BINANCE_REST_BASE`,
  `FOREX_INDICATIVE_BASE`, and `FOREX_POLL_INTERVAL_MS`.
- Optional token lifetime configuration: `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL_DAYS`, and
  `JWT_ADMIN_TTL`.

Generate three distinct, random JWT secrets of at least 32 characters. Generate `ENCRYPTION_KEY`
as 64 hex characters (32 random bytes). These secrets are not interchangeable. Store them only
in Hostinger's private environment configuration and keep a secure backup: rotating the
encryption key can make previously encrypted API credentials unreadable.

### Frontend build environment (`frontend/`)

Set these before the production build because Next.js embeds `NEXT_PUBLIC_*` values in browser
assets:

- `NEXT_PUBLIC_API_URL=https://api.example.com`
- `NEXT_PUBLIC_WS_URL=wss://api.example.com/ws` only if Hostinger confirms WebSocket proxying.
- `NEXT_PUBLIC_MARKET_POLL_INTERVAL_MS=10000` (optional; minimum 1000 ms).

The frontend build fails if `NEXT_PUBLIC_API_URL` is absent or points to localhost in production.
If WebSockets are not supported or not yet confirmed, omit `NEXT_PUBLIC_WS_URL`; the frontend
will not open a socket and will refresh market data over REST polling. This keeps prices updating
without relying on persistent WebSocket connections.

The MariaDB hostname must be reachable from the API app and its connection must be permitted by
Hostinger. Confirm any database remote-access allowlist and TLS requirement in hPanel. Do not
change database grants or schema as part of application deployment.

## Health check and read-only verification

Configure the platform health check to:

```text
GET https://api.example.com/health
```

After deployment, verify without creating an account or performing financial writes:

```sh
curl --fail https://api.example.com/health
curl --fail https://api.example.com/api/markets
```

Open the frontend over HTTPS, inspect browser network requests for the configured API hostname,
and confirm unauthenticated protected endpoints return `401`. Verify the markets view continues
to refresh when the WebSocket endpoint is unavailable. Do not use production registration,
deposit, withdrawal, order, or admin-seeding actions as deployment probes.

## Schema and one-time operational tasks

Production app startup never runs migrations. The existing initialized database is expected.
Only run a future migration as a separately reviewed, explicitly authorized maintenance action,
after taking a backup and verifying the target database identity. Never add migration execution
to a Hostinger start command.

User registration is available through the application. Admin provisioning is a separate,
privileged database write; if needed, run the existing `npm run seed:admin` only as a deliberate
one-time operation with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set privately in that process. Do not
put these values in a public or committed file.

## Product limitations to resolve before public launch

- WebSocket availability on the paid plan is unverified. If unsupported, market quotes use the
  REST polling fallback; account event updates do not have that market-data polling fallback.
- Live broker/exchange order execution is not implemented. The trading engine is demo-only.
- Deposits and withdrawals have no real payment-provider integration.
- Email delivery and password-reset delivery are not configured. Do not present these flows as
  operational until a private email provider and its credentials are integrated.
- KYC uploads do not yet use private durable object storage; configure that before accepting
  production documents.

This guide describes code/configuration preparation, not a completed Hostinger deployment.
The hosting plan, DNS, app processes, database connectivity from the app runtime, and HTTPS
behavior still need verification in the Hostinger account.
