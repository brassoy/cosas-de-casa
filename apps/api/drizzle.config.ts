import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

/**
 * Configuración de drizzle-kit (generación y aplicación de migraciones).
 *
 * Carga DATABASE_URL desde el `.env` de la raíz del monorepo usando
 * `process.loadEnvFile` (Node >= 20.6), sin depender de dotenv. drizzle-kit se
 * ejecuta desde `apps/api`, por eso resolvemos `../../.env`.
 *
 * El esquema canónico vive en `src/db/schema.ts`; las migraciones SQL se
 * versionan en `./drizzle`.
 */
for (const candidate of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL no está definida; no se puede ejecutar drizzle-kit.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: databaseUrl },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
