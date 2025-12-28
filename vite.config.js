import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import javascriptObfuscator from 'vite-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'NIGHTFALL - Streaming Service',
        short_name: 'NIGHTFALL',
        description: 'Your ultimate streaming service for movies and TV shows',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://img.freepik.com/premium-photo/3d-bat-full-moon-border-with-nightfall-text-concept-as-dark-eerie-border-frame-featuring-b_980716-577940.jpg?w=192',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://img.freepik.com/premium-photo/3d-bat-full-moon-border-with-nightfall-text-concept-as-dark-eerie-border-frame-featuring-b_980716-577940.jpg?w=512',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        categories: ['entertainment'],
        lang: 'en',
        dir: 'ltr'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    }),
    mode === 'production' && javascriptObfuscator({
      compact: true,
      stringArray: true,
      rotateStringArray: true,
      stringArrayEncoding: ['base64'],
      splitStrings: false,
      controlFlowFlattening: false,
      deadCodeInjection: false
    })
  ].filter(Boolean),
  build: {
    sourcemap: false,
    minify: 'esbuild'
  },
  base: '/',
}))
