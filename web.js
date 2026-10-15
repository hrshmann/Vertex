// Hostinger entry file for the website app (build command: build:web). Hostinger runs entry files
// from the repository root, so this starts the Next.js standalone server built in frontend/.
// The standalone server binds to $HOSTNAME, which hosts often set to the machine name; bind to
// all interfaces instead so the platform proxy can reach it. It listens on $PORT.
process.env.HOSTNAME = process.env.BIND_HOST || "0.0.0.0";
require("./frontend/.next/standalone/server.js");
