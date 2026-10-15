// Writes .env.hostinger, the environment file to import into the Hostinger app
// ("Import from .env file"). It matches the repository's `.env*` gitignore rule, so it is never
// committed.
//
// Usage: npm run hostinger:env -- --domain example.com [--rotate]
//   --domain  your registrable domain: the site and API are served on https://example.com
//             (and https://www.example.com)
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
const outFile = path.join(root, ".env.hostinger");
// Files from the earlier two-app layout; their secrets are carried over, then they are removed.
const legacyFiles = [path.join(root, ".env.hostinger-api"), path.join(root, ".env.hostinger-web")];
const backendEnvFile = path.join(root, "database", "backend", ".env");

const args = process.argv.slice(2);
const domainIndex = args.indexOf("--domain");
const domain = domainIndex >= 0 ? args[domainIndex + 1]?.trim().toLowerCase() : undefined;
const rotate = args.includes("--rotate");

if (!domain || !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || domain.startsWith("www.")) {
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

const previous = rotate ? {} : { ...parseEnv(legacyFiles[0]), ...parseEnv(outFile) };
const secret = (key, make) => previous[key] || make();
const randomSecret = () => crypto.randomBytes(48).toString("base64url");

const site = `https://${domain}`;
const wwwSite = `https://www.${domain}`;

const entries = [
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
  // Origins allowed for the /ws WebSocket handshake and cross-origin API calls.
  ["CORS_ORIGIN", `${site},${wwwSite}`],
  ["TRUST_PROXY_HOPS", previous.TRUST_PROXY_HOPS || "1"],
];

fs.writeFileSync(outFile, format(entries), { mode: 0o600 });
for (const file of legacyFiles) fs.rmSync(file, { force: true });

console.log(`
Wrote ${outFile}
  -> import it into the Hostinger Node.js app for ${domain}

Site and API: ${site} (and ${wwwSite})
Secrets:      ${rotate || !previous.JWT_ACCESS_SECRET ? "newly generated" : "kept from the existing file"}

This file contains your database password and signing secrets. Keep it private and back it up
somewhere safe; never commit or share it.
`);
