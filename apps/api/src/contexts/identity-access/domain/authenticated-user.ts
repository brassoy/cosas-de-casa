/**
 * Usuario autenticado tal como lo deriva el contexto identity-access a partir
 * de un JWT verificado. Es lo que queda disponible en `request.user`.
 */
export interface AuthenticatedUser {
  /** uid de Supabase (claim `sub`); coincide con `app_users.id`. */
  id: string;
  email: string;
  displayName: string | null;
}
