import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Igual que vitest.config.ts pero orientado a integración:
//  - Incluye test/integration/**
//  - Carga .env antes de los tests (setupFile)
//  - Ejecución secuencial (singleFork) para no pelearse por la BD
//  - Timeout generoso (30 s) para operaciones de red / Supabase
//
// Nota Vitest 4: las opciones de pool que antes estaban en `poolOptions` ahora
// son top-level. `singleFork: true` garantiza que todos los tests de integración
// corren en un único proceso worker (sin concurrencia de BD).
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    setupFiles: ['test/support/setup-env.ts'],
    testTimeout: 30000,
    pool: 'forks',
    // Vitest 4: singleFork es top-level (no dentro de poolOptions)
    singleFork: true,
  },
});
