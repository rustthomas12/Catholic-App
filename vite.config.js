import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { preloadHomeScreen } from './build/preloadHomeScreen.js'

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        // date-fns otherwise splits into many ~1 KB files that the home
        // screen needs before it can draw (not used at startup itself, so
        // this doesn't grow the first download)
        codeSplitting: {
          groups: [{ name: 'date-fns', test: /node_modules\/date-fns\// }],
        },
      },
    },
  },
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
    preloadHomeScreen(),
    VitePWA({
      // 'prompt', not 'autoUpdate': autoUpdate reloaded the page the moment a
      // new build was found, often seconds after opening, wiping whatever
      // someone was typing. main.jsx now decides when reloading is safe.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'brand/**/*.svg', 'brand/fonts/*.ttf'],
      devOptions: {
        // Off: the dev SW served stale /src/main.jsx and booted the app twice.
        enabled: false,
      },
      manifest: {
        name: 'inFold',
        short_name: 'inFold',
        description: 'The Catholic parish and community platform',
        theme_color: '#6FCDFF', // inFold Blue (brand/README.md)
        background_color: '#FAF7F2',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        // inFold brand kit (brand/); the maskable one (full-bleed, for
        // Android's circle crop) is built by scripts/generate-app-assets.mjs
        icons: [
          { src: '/brand/icon/infold-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon/infold-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        // sw-push.js handles push events and notification clicks.
        // Loaded via importScripts so it runs after Workbox is set up.
        importScripts: ['/sw-push.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
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
