import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      // Forward /api/* to Vercel dev server (run `vercel dev` on port 3000)
      '/api': {
        // API_PROXY_TARGET lets e2e tests point at a deployed API
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'brand/*.svg'],
      devOptions: {
        // Off: the dev SW served stale /src/main.jsx and booted the app twice.
        enabled: false,
      },
      manifest: {
        name: 'inFold',
        short_name: 'inFold',
        description: 'The Catholic parish and community platform',
        theme_color: '#1B2A4A',
        background_color: '#FAF7F2',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        // inFold logo pack (brand/), built by scripts/generate-app-assets.mjs.
        // PNG for installers that ignore SVG icons; maskable is full-bleed.
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // sw-push.js handles push events and notification clicks.
        // Loaded via importScripts so it runs after Workbox is set up.
        importScripts: ['/sw-push.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Supabase REST/auth requests are intentionally NOT cached here.
          // They are authenticated (Bearer token) and already cached at the
          // hook level. Service-worker caching of these calls causes stale
          // data and can break auth token refreshes on page reload.
        ],
      },
    }),
  ],
})
