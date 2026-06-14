/** @type {import('next').NextConfig} */
const nextConfig = {
  // youtubei.js pulls in some Node-only bits; keep it external to the
  // server bundle so the App Router build doesn't choke on it.
  experimental: {
    serverComponentsExternalPackages: ['youtubei.js'],
  },
};

export default nextConfig;
