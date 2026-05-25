import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

/**
 * Tipo de la conexión Drizzle ligada a nuestro esquema. Se usa tanto para la
 * conexión raíz como para la instancia transaccional que reciben los repos.
 */
export type Database = NodePgDatabase<typeof schema>;

/**
 * Una transacción Drizzle expone la misma API de consultas que la conexión.
 * Los repositorios trabajan contra este tipo para poder ejecutarse dentro de
 * una Unit of Work (transacción por petición) sin saber si están o no en una.
 */
export type DatabaseExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
