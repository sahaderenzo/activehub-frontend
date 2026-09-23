/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas automatizadas (Vitest). Corren con `npm test`; ver `docs/PRUEBAS.md`.
  test: {
    // Las pruebas de pantalla necesitan DOM: `jsdom` lo provee sin abrir un navegador.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Sin `globals`: cada archivo importa `describe`/`it`/`expect` de "vitest". Es una línea
    // más por archivo y a cambio no hay identificadores mágicos que ESLint no conozca ni
    // tipos globales que haya que declarar aparte.
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Lo que no tiene sentido medir: datos, tipos y el punto de entrada.
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/lib/types.ts', 'src/test/**'],
    },
  },
})
