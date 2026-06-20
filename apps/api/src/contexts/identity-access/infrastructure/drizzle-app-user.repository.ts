import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../db/db.types';
import { DRIZZLE } from '../../../db/drizzle.tokens';
import { appUsers } from '../../../db/schema';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type {
  AppUserRepository,
  UpdateProfileParams,
  UpsertAppUserParams,
} from '../domain/ports/app-user.repository';

/** Adaptador Drizzle de {@link AppUserRepository}. */
@Injectable()
export class DrizzleAppUserRepository implements AppUserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async upsertFromClaims(params: UpsertAppUserParams): Promise<AuthenticatedUser> {
    // Upsert por PK (id = uid de Supabase). Actualizamos el email siempre; el
    // display_name solo lo fijamos si aún no había uno (COALESCE del existente).
    const [row] = await this.db
      .insert(appUsers)
      .values({
        id: params.id,
        email: params.email,
        displayName: params.defaultDisplayName ?? null,
      })
      .onConflictDoUpdate({
        target: appUsers.id,
        set: {
          email: params.email,
          displayName: sql`coalesce(${appUsers.displayName}, ${params.defaultDisplayName ?? null})`,
        },
      })
      .returning();

    // `row` siempre existe tras un upsert con returning.
    return {
      id: row!.id,
      email: row!.email,
      displayName: row!.displayName,
      avatarUrl: row!.avatarUrl,
    };
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    const rows = await this.db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    };
  }

  async updateProfile(id: string, params: UpdateProfileParams): Promise<AuthenticatedUser> {
    // Cambio EXPLÍCITO del usuario: pisamos los campos presentes (sin COALESCE, a
    // diferencia del upsert JIT que solo fija el nombre si aún no había uno).
    // Solo incluimos en el SET las claves presentes en `params`; así `avatarUrl:
    // null` BORRA el avatar, mientras que `undefined` (ausente) lo deja intacto.
    const set: Partial<typeof appUsers.$inferInsert> = {};
    if (params.displayName !== undefined) {
      set.displayName = params.displayName;
    }
    if (params.avatarUrl !== undefined) {
      set.avatarUrl = params.avatarUrl;
    }

    const [row] = await this.db
      .update(appUsers)
      .set(set)
      .where(eq(appUsers.id, id))
      .returning();

    // `row` siempre existe: el usuario está aprovisionado por el guard antes de
    // llegar aquí (request.user proviene del upsert JIT).
    return {
      id: row!.id,
      email: row!.email,
      displayName: row!.displayName,
      avatarUrl: row!.avatarUrl,
    };
  }
}
