import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sweph'],
  async headers() {
    return [
      {
        // Service worker must not be cached so updates ship immediately
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',  value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        // Manifest must be fresh so icon/name changes are picked up
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
