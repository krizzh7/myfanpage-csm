import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: { ignored: ['**/source/**', '**/node_modules/**', '**/dist/**'] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'react-three': ['@react-three/fiber', '@react-three/drei'],
          animation: ['gsap', 'lenis'],
        },
      },
    },
  },
});
