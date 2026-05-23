/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: '/sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-font-assets' },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-image-assets', expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/static.+\.js$/i,
      handler: 'CacheFirst',
      options: { cacheName: 'next-static-js-assets', expiration: { maxAgeSeconds: 7 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/static.+\.css$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-static-css-assets' },
    },
    {
      urlPattern: /\.(?:json)$/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'static-data-assets' },
    },
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'others', networkTimeoutSeconds: 10 },
    },
  ],
});

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

module.exports = withPWA(nextConfig);
