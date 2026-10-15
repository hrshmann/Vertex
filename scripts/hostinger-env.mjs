// Writes the two environment files to import into Hostinger ("Import from .env file"):
//   .env.hostinger-api  -> API app      (runtime settings, secrets, database login)
//   .env.hostinger-web  -> website app  (public API URL, embedded at build time)
// Both match the repository's `.env*` gitignore rule, so they are never committed.
//
// Usage: npm run hostinger:env -- --domain example.com [--rotate]
//   --domain  your registrable domain: site on https://example.com and https://www.example.com,
//             API on https://api.example.com
//   --rotate  generate new secrets. Without it, secrets from an existing file are kept, because
//             new ones log every user out and make stored encrypted values unreadable.
//
// Database settings are read from database/backend/.env (the values that already work for you
// locally); DB_HOST becomes `localhost`, which is how Hostinger apps reach Hostinger MySQL.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiFile = path.join(root, ".env.hostinger-api");
const webFile = path.join(root, ".env.hostinger-web");
const backendEnvFile = path.join(root, "database", "backend", ".env");

const args = process.argv.slice(2);
const domainIndex = args.indexOf("--domain");
const domain = domainIndex >= 0 ? args[domainIndex + 1]?.trim().toLowerCase() : undefined;
const rotate = args.includes("--rotate");

if (!domain || !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || domain.startsWith("www.") || domain.startsWith("api.")) {
  fail("Pass your domain without https:// or www, e.g.  npm run hostinger:env -- --domain example.com");
}

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function fail(message) {
  console.error(`\n[hostinger:env] ${message}\n`);
  process.exit(1);
}

function format(entries) {
  return (
    entries
      .map(([key, value]) => (/[\s#"'\\]/.test(value) ? `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : `${key}=${value}`))
      .join("\n") + "\n"
  );
}

const local = parseEnv(backendEnvFile);
for (const key of ["DB_NAME", "DB_USER", "DB_PASSWORD"]) {
  if (!local[key]) fail(`${key} is missing from database/backend/.env — add your Hostinger database login there first.`);
}

const previous = rotate ? {} : parseEnv(apiFile);
const secret = (key, make) => previous[key] || make();
const randomSecret = () => crypto.randomBytes(48).toString("base64url");

const site = `https://${domain}`;
const wwwSite = `https://www.${domain}`;
const api = `https://api.${domain}`;

const apiEnv = [
  ["NODE_ENV", "production"],
  ["DB_HOST", "localhost"],
  ["DB_PORT", local.DB_PORT || "3306"],
  ["DB_NAME", local.DB_NAME],
  ["DB_USER", local.DB_USER],
  ["DB_PASSWORD", local.DB_PASSWORD],
  ["DB_CONNECTION_LIMIT", "5"],
  ["JWT_ACCESS_SECRET", secret("JWT_ACCESS_SECRET", randomSecret)],
  ["JWT_REFRESH_SECRET", secret("JWT_REFRESH_SECRET", randomSecret)],
  ["JWT_ADMIN_SECRET", secret("JWT_ADMIN_SECRET", randomSecret)],
  ["ENCRYPTION_KEY", secret("ENCRYPTION_KEY", () => crypto.randomBytes(32).toString("hex"))],
  ["CORS_ORIGIN", `${site},${wwwSite}`],
  ["TRUST_PROXY_HOPS", previous.TRUST_PROXY_HOPS || "1"],
];
const webEnv = [
  ["NEXT_PUBLIC_API_URL", api],
  ["NEXT_PUBLIC_WS_URL", `wss://api.${domain}/ws`],
];

fs.writeFileSync(apiFile, format(apiEnv), { mode: 0o600 });
fs.writeFileSync(webFile, format(webEnv), { mode: 0o600 });

console.log(`
Wrote:
  ${apiFile}   -> import into the API app (api.${domain})
  ${webFile}   -> import into the website app (${domain})

Website: ${site} (and ${wwwSite})
API:     ${api}
Secrets: ${rotate || !Object.keys(previous).length ? "newly generated" : "kept from the existing file"}

These files contain your database password and signing secrets. Keep them private and back
them up somewhere safe; never commit or share them.
`);
