import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Gives `next dev` access to the local D1 database + secrets in .dev.vars
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
