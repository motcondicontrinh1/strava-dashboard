import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'virtualization': ['react-window', '@tanstack/react-virtual'],
        },
      },
    },
    // Enable compression
    brotliSize: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
  },
  // Optimize dev server
  server: {
    hmr: {
      overlay: false,
    },
  },
});
