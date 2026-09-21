/** @type {import('next').NextConfig} */
const agentInternal = process.env.AGENT_INTERNAL_URL || "http://127.0.0.1:8787";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/vaults/:path*", destination: `${agentInternal}/vaults/:path*` },
      { source: "/ws", destination: `${agentInternal}/ws` },
    ];
  },
};

export default nextConfig;
