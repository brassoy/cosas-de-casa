/* ─── Contrato de props — vistas de la feature `settings` ───────────────────
 *
 * Una interface por pantalla (`SettingsViewProps`), idéntica para los 4 themes.
 * La pantalla de ajustes tiene cuatro secciones (perfil, contraseña, familias,
 * apariencia) más un botón de cerrar sesión. Presentacional puro: props in /
 * callbacks out.
 *
 * Notas del contrato:
 *  - `email` es el correo actual; ahora SÍ se puede cambiar (Supabase manda un
 *    correo de verificación y el cambio solo se aplica al confirmarlo, por eso el
 *    `email` mostrado no cambia al instante). `onChangeEmail` recibe el email ya
 *    recortado por la vista, que valida formato; el container reporta
 *    `emailError`/`emailOk`.
 *  - `onSaveName` recibe el nombre ya recortado por la vista; el container valida
 *    contra `UpdateProfileInputSchema` y reporta `nameError` si el backend falla.
 *  - El cambio de contraseña valida en la vista (mínimo 6 + confirmación); el
 *    container reporta `passwordError`/`passwordOk` según el resultado de Supabase.
 *  - La sección de familias lista la familia activa y permite salir; la salida es
 *    destructiva, así que el container confirma (`window.confirm`) antes de
 *    invocar `onLeaveFamily` y navega a "/" tras el éxito.
 *  - La sección de apariencia la pinta cada vista con su propio selector de theme
 *    (no hay callback: el cambio persiste directo en localStorage / <html>).
 * ─────────────────────────────────────────────────────────────────────────── */

/** Familia mostrada en la sección "Familias" de los ajustes. */
export interface SettingsFamily {
  id: string;
  name: string;
  /** `true` si es la familia activa actual (la que está seleccionada). */
  active?: boolean;
}

/**
 * Validación de formato de email a nivel de UI (compartida por las 4 vistas).
 * No es la fuente de verdad (Supabase valida de verdad al pedir el cambio);
 * solo evita disparar la mutación con un valor obviamente inválido.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface SettingsViewProps {
  /** Nombre visible actual; `null` mientras carga o si no está definido. */
  displayName: string | null;
  /** Correo del usuario (actual; el cambio requiere verificación por email). */
  email: string | null;
  /** Carga inicial del perfil en curso. */
  loading?: boolean;

  /** Guarda el nombre (ya recortado por la vista). */
  onSaveName: (name: string) => void;
  /** Guardado del nombre en curso. */
  savingName?: boolean;
  /** Error al guardar el nombre; `null`/`undefined` si no hay. */
  nameError?: string | null;
  /** El nombre se guardó correctamente (para el aviso de éxito). */
  nameOk?: boolean;

  /** Cambia el email (ya recortado y validado de formato por la vista). */
  onChangeEmail: (email: string) => void;
  /** Cambio de email en curso. */
  changingEmail?: boolean;
  /** Error al cambiar el email; `null`/`undefined` si no hay. */
  emailError?: string | null;
  /** Se solicitó el cambio de email correctamente (aviso de verificación). */
  emailOk?: boolean;

  /** Cambia la contraseña (ya validada por la vista). */
  onChangePassword: (password: string) => void;
  /** Cambio de contraseña en curso. */
  changingPassword?: boolean;
  /** Error al cambiar la contraseña; `null`/`undefined` si no hay. */
  passwordError?: string | null;
  /** La contraseña se cambió correctamente (para el aviso de éxito). */
  passwordOk?: boolean;

  /** Familias del usuario (la activa va marcada con `active`). */
  families?: SettingsFamily[];
  /** Sale de una familia (el container confirma y navega a "/" tras éxito). */
  onLeaveFamily: (familyId: string) => void;
  /** Salida de una familia en curso. */
  leavingFamily?: boolean;
  /** Error al salir de la familia; `null`/`undefined` si no hay. */
  leaveError?: string | null;

  /** Cierra la sesión (el container hace signOut + navega a /login). */
  onLogout: () => void;
}
