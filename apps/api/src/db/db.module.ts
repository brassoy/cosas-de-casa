import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Env } from '../config/env.config';
import { DRIZZLE, PG_POOL } from './drizzle.tokens';
import * as schema from './schema';

/**
 * Módulo global de base de datos.
 *
 * Crea un único `Pool` de node-postgres y la instancia Drizzle asociada,
 * disponibles por DI en toda la app vía los tokens {@link PG_POOL} y
 * {@link DRIZZLE}. Cierra el pool limpiamente al apagar la aplicación.
 *
 * La API se conecta con un rol normal (no `service_role`) que respeta RLS.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Pool => {
        const connectionString = config.get('DATABASE_URL', { infer: true });
        if (!connectionString) {
          throw new Error('DATABASE_URL es obligatoria para arrancar la API.');
        }
        return new Pool({ connectionString, max: 10 });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema, casing: 'snake_case' }),
    },
  ],
  exports: [PG_POOL, DRIZZLE],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
