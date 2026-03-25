const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use this app as the tracing root so Next does not pick up a parent package-lock.json
  // (e.g. ~/package-lock.json), which breaks chunk resolution and triggers wrong workspace root.
  outputFileTracingRoot: path.join(__dirname),
  // Fewer dev-only portal nodes — helps embedded browsers (e.g. Cursor Simple Browser element picker).
  devIndicators: false,
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

module.exports = nextConfig;
