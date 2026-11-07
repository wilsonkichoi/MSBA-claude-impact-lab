import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // unpdf bundles its own pdf.js build; keep it out of the server bundle graph.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
