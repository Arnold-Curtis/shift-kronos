import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      method: "GET",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "StaleWhileRevalidate",
      method: "GET",
      options: {
        cacheName: "next-static-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\.(?:png|svg|jpg|jpeg|webp|gif|ico)$/i,
      handler: "StaleWhileRevalidate",
      method: "GET",
      options: {
        cacheName: "static-images",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default withPWA(nextConfig);
