/* ─── Contrato de props — vistas de la feature `settings` ───────────────────
 *
 * Una interface por pantalla (`SettingsViewProps`), idéntica para los 4 themes.
 * La pantalla de ajustes tiene tres secciones (perfil, contraseña, apariencia)
 * más un botón de cerrar sesión. Presentacional puro: props in / callbacks out.
 *
 * Notas del contrato:
 *  - `email` es solo lectura (Supabase es la fuente; no se cambia desde aquí).
 *  - `onSaveName` recibe el nombre ya recortado por la vista; el container valida
 *    contra `UpdateProfileInputSchema` y reporta `nameError` si el backend falla.
 *  - El cambio de contraseña valida en la vista (mínimo 6 + confirmación); el
 *    container reporta `passwordError`/`passwordOk` según el resultado de Supabase.
 *  - La sección de apariencia la pinta cada vista con su propio selector de theme
 *    (no hay callback: el cambio persiste directo en localStorage / <html>).
 * ─────────────────────────────────────────────────────────────────────────── */

export interface SettingsViewProps {
  /** Nombre visible actual; `null` mientras carga o si no está definido. */
  displayName: string | null;
  /** Correo del usuario (solo lectura). */
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

  /** Cambia la contraseña (ya validada por la vista). */
  onChangePassword: (password: string) => void;
  /** Cambio de contraseña en curso. */
  changingPassword?: boolean;
  /** Error al cambiar la contraseña; `null`/`undefined` si no hay. */
  passwordError?: string | null;
  /** La contraseña se cambió correctamente (para el aviso de éxito). */
  passwordOk?: boolean;

  /** Cierra la sesión (el container hace signOut + navega a /login). */
  onLogout: () => void;
}
