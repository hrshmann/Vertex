// Hostinger entry file (build command: build). One Node.js app serves the whole site on one
// address: the API handles /api, /health and the /ws WebSocket, and every other request goes to
// the Next.js website built in frontend/. Hostinger runs entry files from the repository root.
const path = require("node:path");

process.env.NODE_ENV = "production";

const standaloneDir = path.join(__dirname, "frontend", ".next", "standalone");

async function main() {
  // Same bootstrap as the standalone server.js that `next build` generates, but handing the
  // request handler to the API server instead of letting Next.js open its own port.
  const { config } = require(path.join(__dirname, "frontend", ".next", "required-server-files.json"));
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  const next = require(path.join(standaloneDir, "node_modules", "next"));
  const website = next({
    dev: false,
    dir: standaloneDir,
    conf: config,
    hostname: "localhost",
    port: Number(process.env.PORT) || 4000,
  });
  await website.prepare();

  const { startServer } = require("./database/backend/dist/server.js");
  await startServer({ frontendHandler: website.getRequestHandler() });
}

main().catch((err) => {
  console.error("[fatal] failed to start", err);
  process.exit(1);
});
