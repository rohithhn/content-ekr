/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  env: {},
};

export default nextConfig;
