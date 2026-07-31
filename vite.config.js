import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // Google OAuth validates the exact browser origin, and only
  // http://localhost:5173 is registered. 
  server: {
    port: 5173,
    strictPort: true,
  },
})
