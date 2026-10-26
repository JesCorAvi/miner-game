import { defineConfig } from 'vite';

export default defineConfig({
  // Relativa: sirve igual en GitHub Pages (/repo/), en preview y bajo carbon://.
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
});
