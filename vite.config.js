import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We call registerSW() ourselves in main.jsx (virtual:pwa-register) so
      // it can force a reload when a new version takes over — the default
      // injected registerSW.js for injectManifest mode is a bare
      // navigator.serviceWorker.register() with no update/reload logic at all.
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // service worker source has no other precacheable build output to inject beyond the app shell
        injectionPoint: 'self.__WB_MANIFEST'
      },
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-192.png',
        'icons/icon-maskable-512.png'
      ],
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        name: 'AI Time Manager',
        short_name: 'AI Planner',
        description: 'Персональный ИИ-тайм-менеджер и голосовой ассистент',
        theme_color: '#12141C',
        background_color: '#12141C',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    // проксируем локальные вызовы к serverless-функции при разработке через vercel dev
    port: 5173
  }
})
