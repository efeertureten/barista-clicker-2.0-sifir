import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' sayesinde derlenen site hem GitHub Pages alt yolunda
// (kullanici.github.io/repo-adi/) hem de herhangi bir klasörde çalışır.
export default defineConfig({
  base: './',
  plugins: [react()],
});
