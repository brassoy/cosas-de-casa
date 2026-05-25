import { defineConfig } from 'vitest/config';

// Solo los tests del fuente; nunca los compilados en dist/ (serían CommonJS).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
