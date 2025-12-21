import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 确保在 GitHub Pages 子路径下资源路径正确
  build: {
    outDir: 'dist',
  },
});