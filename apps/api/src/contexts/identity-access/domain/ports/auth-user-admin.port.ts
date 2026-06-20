export const AUTH_USER_ADMIN = Symbol('AUTH_USER_ADMIN');

/**
 * Puerto de administración del proveedor de identidad (Supabase Auth).
 *
 * Solo expone la operación que necesita la baja de cuenta: borrar el usuario del
 * proveedor de Auth para que su login deje de existir. Es un puerto de INFRA: la
 * implementación real usa el cliente admin de Supabase con el `service_role`.
 *
 * Es OPCIONAL por diseño: si no hay `service_role` configurada (dev/test local),
 * el adaptador es un no-op que solo registra un aviso. La baja de los DATOS de la
 * app (familias, memberships, app_user) se hace igualmente; lo único que no
 * ocurre sin service-role es el borrado de la credencial en el proveedor.
 */
export interface AuthUserAdmin {
  /**
   * Borra el usuario del proveedor de Auth por su uid. No lanza si el usuario ya
   * no existe en el proveedor (idempotente desde el punto de vista de la baja).
   */
  deleteAuthUser(userId: string): Promise<void>;
}
