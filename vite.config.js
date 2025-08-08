import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  define: {
    'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(new Date().toISOString())
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['react-router-dom', 'primereact']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
