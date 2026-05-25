/**
 * Tokens de inyección para la capa de persistencia.
 *
 * Se exponen como tokens (no clases) para que los módulos de cada contexto
 * inyecten la conexión sin acoplarse a la implementación concreta del pool.
 */
export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE = Symbol('DRIZZLE');
