import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuracion de tests del cliente. Separada de vite.config.ts porque el
// build de produccion no debe arrastrar el entorno de pruebas.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/setupTests.ts', 'src/main.tsx'],
    },
  },
});
