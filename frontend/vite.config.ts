import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [
    react(), 
    tailwindcss(),
  ],
  esbuild: {
    // @ts-expect-error: Vite config type mismatch for esbuild.drop
    drop: ['console', 'debugger'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost/Money%20Collection%202K',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost/Money%20Collection%202K',
        changeOrigin: true,
      },
    },
  },
})
