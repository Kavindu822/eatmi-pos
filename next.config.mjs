/** @type {import('next').NextConfig} */
import path from 'node:path';

const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  outputFileTracingRoot: path.resolve('.'),
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'trycloudflare.com',
    'localhost:8787',
    'localhost',
    '127.0.0.1:8787',
    '127.0.0.1'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },
  serverExternalPackages: ['node:sqlite'],
};

export default nextConfig;

