import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fileMetaPlugin from './vite-plugin-file-meta';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    fileMetaPlugin()
  ],
  define: {
    'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(new Date().toISOString())
  }
})
