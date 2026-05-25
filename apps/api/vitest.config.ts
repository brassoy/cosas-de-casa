import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS usa decoradores con metadata en runtime; SWC los transpila conservando
// `emitDecoratorMetadata` para que la inyección de dependencias funcione en los tests.
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
    include: ['src/**/*.spec.ts'],
  },
});
