import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 es un binario nativo: no debe pasar por el bundler.
  serverExternalPackages: ["better-sqlite3"],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default nextConfig;
