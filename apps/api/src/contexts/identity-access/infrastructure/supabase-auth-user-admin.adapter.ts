import { Logger } from '@nestjs/common';
import type { AuthUserAdmin } from '../domain/ports/auth-user-admin.port';

/**
 * Adaptador de {@link AuthUserAdmin} contra Supabase Auth usando la `service_role`.
 *
 * Borra el usuario del proveedor de Auth con el endpoint admin:
 *   `DELETE /auth/v1/admin/users/:id`  (apikey + Bearer = service_role)
 *
 * GOTCHA (Node 20): NO usamos `@supabase/supabase-js` (`auth.admin.deleteUser`)
 * a propósito. Ese SDK inicializa el módulo realtime, que requiere WebSocket
 * nativo (Node >= 22) y lanza en Node 20 (el runtime objetivo del proyecto). El
 * mismo motivo por el que `test/support/supabase-admin.ts` usa `fetch` directo.
 *
 * Es OPCIONAL: la fábrica de DI solo crea este adaptador si hay `service_role`.
 * Si no la hay, se cablea {@link NoopAuthUserAdmin} en su lugar.
 */
export class SupabaseAuthUserAdmin implements AuthUserAdmin {
  private readonly logger = new Logger(SupabaseAuthUserAdmin.name);

  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
  ) {}

  async deleteAuthUser(userId: string): Promise<void> {
    const res = await fetch(`${this.supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
    });

    // 404 = el usuario ya no existe en el proveedor: idempotente, no es un error
    // desde el punto de vista de la baja (los datos de la app ya se borraron).
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '');
      // No relanzamos: la baja de DATOS ya se completó (app_user borrado). Dejar
      // un usuario huérfano en Auth es recuperable; romper el 204 al cliente no
      // aporta nada. Lo registramos para poder limpiarlo manualmente si hace falta.
      this.logger.error(
        `No se pudo borrar el usuario ${userId} de Supabase Auth (${res.status}: ${body}). ` +
          'Los datos de la app SÍ se borraron; revisa el usuario huérfano en Auth.',
      );
    }
  }
}

/**
 * No-op de {@link AuthUserAdmin}: se usa cuando no hay `service_role` configurada
 * (dev/test local). La baja de los DATOS de la app se hace igualmente; lo único
 * que no ocurre es el borrado de la credencial en el proveedor de Auth.
 */
export class NoopAuthUserAdmin implements AuthUserAdmin {
  private readonly logger = new Logger(NoopAuthUserAdmin.name);

  async deleteAuthUser(userId: string): Promise<void> {
    this.logger.warn(
      `SUPABASE_SERVICE_ROLE_KEY no configurada: no se borra el usuario ${userId} de Supabase Auth. ` +
        'Sus datos de la app SÍ se han borrado.',
    );
  }
}
