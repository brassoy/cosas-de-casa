/* ─── Contrato de props — vistas de la feature `auth` ───────────────────────
 *
 * Una interface por pantalla (plan §2.4). El contrato es el del componente base
 * del kit (`AuthPageProps` en /tmp/hogar-feliz/src/screens/auth.tsx).
 *
 * Auth NO tiene DTOs en `@cosasdecasa/contracts`: el flujo va 100% por Supabase
 * con email/contraseña (strings). Por tanto no hay tipos del kit que reconciliar
 * con DTOs reales — el contrato es directamente el del kit, ajustado a lo que la
 * lógica real necesita:
 *   - `error`: capturado en try/catch del container (login) o en la propia vista.
 *   - `signupSuccess`: se setea tras `signUp` (Supabase email confirmation) antes
 *     de redirigir a /login. No aplica a login.
 *   - `isSubmitting`: viene de `useAuthStore().loading` (más el estado local de
 *     envío de la vista).
 * ─────────────────────────────────────────────────────────────────────────── */

export interface AuthViewProps {
  /** Pantalla activa: `login` (auth_login) o `signup` (auth_signup). */
  mode: 'login' | 'signup';
  /** El submit está en curso (store.loading o envío en vuelo). */
  isSubmitting?: boolean;
  /** Mensaje de error de credenciales/registro a mostrar. */
  error?: string | null;
  /** Solo signup: tras `signUp`, avisa de confirmar el correo. */
  signupSuccess?: boolean;
  /**
   * Solo login: tras pedir el reset de contraseña, avisa de revisar el correo
   * de recuperación. Lo setea el container al resolver `onForgotPassword`.
   */
  resetEmailSent?: boolean;
  /** Envío del formulario con credenciales ya validadas por la vista. */
  onSubmit: (v: { email: string; password: string }) => void | Promise<void>;
  /** Continuar con Google (OAuth). */
  onGoogle: () => void;
  /** Cambiar entre login/signup (navegación la decide el container). */
  onSwitchMode: () => void;
  /**
   * Solo login: "he olvidado mi contraseña". Recibe el email que el usuario ha
   * escrito en el formulario; el container dispara el correo de recuperación.
   * Opcional: si no se pasa (p. ej. signup), la vista no muestra el enlace.
   */
  onForgotPassword?: (email: string) => void | Promise<void>;
}
