import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: projectRoot,
  },
  // Trading and funds were removed; old links land on the closest page that still exists.
  async redirects() {
    return [
      { source: "/terminal", destination: "/markets", permanent: false },
      { source: "/trading", destination: "/markets", permanent: false },
      { source: "/account-types", destination: "/", permanent: false },
      { source: "/funds", destination: "/dashboard", permanent: false },
      { source: "/history", destination: "/dashboard", permanent: false },
      { source: "/admin/withdrawals", destination: "/admin", permanent: false },
      { source: "/admin/instruments", destination: "/admin", permanent: false },
    ];
  },
};

export default nextConfig;
