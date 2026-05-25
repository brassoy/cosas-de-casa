import type { AuthenticatedUser } from '../authenticated-user';

export const APP_USER_REPOSITORY = Symbol('APP_USER_REPOSITORY');

export interface UpsertAppUserParams {
  id: string;
  email: string;
  /** Nombre por defecto si el usuario aún no tenía uno (p. ej. derivado del email). */
  defaultDisplayName?: string | null;
}

/**
 * Puerto de persistencia de los usuarios de la aplicación (`app_users`).
 *
 * El aprovisionamiento es "just-in-time": en cada petición autenticada se hace
 * upsert desde los claims del JWT, de modo que el primer acceso de un usuario
 * de Supabase crea su fila local sin un endpoint de registro aparte.
 */
export interface AppUserRepository {
  /**
   * Inserta o actualiza el usuario a partir de los claims. Devuelve el usuario
   * resultante (con su displayName actual). No pisa un displayName ya existente
   * con uno por defecto.
   */
  upsertFromClaims(params: UpsertAppUserParams): Promise<AuthenticatedUser>;

  findById(id: string): Promise<AuthenticatedUser | null>;
}
