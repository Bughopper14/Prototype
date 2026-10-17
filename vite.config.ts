import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/crm/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/crm/api': {
        target: 'http://127.0.0.1:3001',
        rewrite: (path) => path.replace(/^\/crm\/api/, '/api')
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-tinymce': ['@tinymce/tinymce-react']
        }
      }
    }
  }
});
