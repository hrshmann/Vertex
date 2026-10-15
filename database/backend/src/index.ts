import { startServer } from "./server";

// Standalone API process (local development, Docker). The single-app Hostinger deployment
// starts the same server from the repository root's app.js, with the website attached.
startServer().catch((err) => {
  console.error("[fatal] failed to start server", err);
  process.exit(1);
});
