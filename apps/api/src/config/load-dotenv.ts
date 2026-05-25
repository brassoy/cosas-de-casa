import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga el `.env` de la RAÍZ del monorepo en `process.env` si todavía no se ha
 * cargado. Usamos `process.loadEnvFile` (Node >= 20.6) para no añadir
 * dependencias (dotenv). Es idempotente y no pisa variables ya presentes
 * inyectadas por el entorno real (CI, contenedor...).
 *
 * Se invoca desde el arranque de Nest, desde drizzle-kit y desde los tests de
 * integración, que se ejecutan desde distintos directorios de trabajo.
 */
export function loadRootDotenv(): void {
  // apps/api/src/config -> raíz del monorepo (../../../..)
  const candidates = [
    resolve(__dirname, '../../../../.env'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        process.loadEnvFile(candidate);
      } catch {
        // Si una clave ya existe, loadEnvFile no lanza; cualquier otro error
        // (permisos, formato) lo ignoramos para no romper el arranque: la
        // validación de entorno (env.config) reportará lo que falte.
      }
      return;
    }
  }
}
