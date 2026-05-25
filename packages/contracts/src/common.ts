import { z } from 'zod';

// ── Tipos de utilidad ────────────────────────────────────────────────────────

/** UUID con brand para evitar confusiones entre distintos identificadores. */
export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

/** Respuesta de error estándar de la API. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  /** Detalle adicional opcional (p. ej. errores de validación). */
  details?: unknown;
}

/** Respuesta paginada genérica. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
