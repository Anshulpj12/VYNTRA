import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path: '/' in local development, '/VYNTRA/' for GitHub Pages production
  base: process.env.NODE_ENV === 'production' ? '/VYNTRA/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
