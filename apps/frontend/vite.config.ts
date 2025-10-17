import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../pb/pb_public'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8090', // need to be env variable
    },
  },
})
