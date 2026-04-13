import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../frontend',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/submit-prompt': 'http://localhost:8000',
      '/auth':          'http://localhost:8000',
      '/admin':         'http://localhost:8000',
      '/health':        'http://localhost:8000',
    },
  },
});
