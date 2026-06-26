import type { NextConfig } from "next";

// GITHUB_ACTIONS is automatically set to "true" in GitHub Actions.
// Cloudflare Pages builds do NOT set this, so basePath stays empty there.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/helloworld" : "",
  trailingSlash: true,
};

export default nextConfig;
