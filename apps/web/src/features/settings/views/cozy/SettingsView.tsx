/* ─── Vista presentacional cozy — settings ──────────────────────────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel pautado, tinta marrón,
 * notas con cinta, fuentes Caveat/Patrick Hand). Misma funcionalidad que la
 * base: Perfil (nombre + email editable), Contraseña, Familias, Apariencia y
 * cerrar sesión.
 *
 * Presentacional puro: props in / callbacks out. La validación de formulario
 * (nombre no vacío, email con formato, contraseña ≥ 6 + confirmar) es UI y vive
 * aquí; el error de negocio llega por props.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useRef, useState } from 'react';
import { getTheme, setTheme, type ThemeName } from '@/shared/theme/theme-bootstrap';
import { avatarInitial, isValidEmail, type SettingsViewProps } from '../types';

const THEMES: { value: ThemeName; label: string; emoji: string }[] = [
  { value: 'base', label: 'Clásico', emoji: '◉' },
  { value: 'cozy', label: 'Cuaderno', emoji: '✎' },
  { value: 'cozysitcom', label: 'Sitcom 70s', emoji: '📺' },
  { value: 'springfield', label: 'Hommer', emoji: '🍩' },
];

export default function SettingsView(props: SettingsViewProps) {
  const {
    displayName,
    email,
    loading,
    avatarUrl,
    onChangeAvatar,
    uploadingAvatar,
    onRemoveAvatar,
    removingAvatar,
    avatarError,
    onSaveName,
    savingName,
    nameError,
    nameOk,
    onChangeEmail,
    changingEmail,
    emailError,
    emailOk,
    onChangePassword,
    changingPassword,
    passwordError,
    passwordOk,
    families,
    onLeaveFamily,
    leavingFamily,
    leaveError,
    onLogout,
    onExportData,
    exportingData,
    exportError,
    accountEmail,
    onDeleteAccount,
    deletingAccount,
    deleteAccountError,
  } = props;

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Zona peligrosa: confirmación FUERTE (escribir el email o "BORRAR").
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const expectedEmail = (accountEmail ?? email ?? '').trim().toLowerCase();
  const typed = deleteConfirm.trim();
  const deleteEnabled =
    typed.length > 0 &&
    (typed.toUpperCase() === 'BORRAR' ||
      (expectedEmail !== '' && typed.toLowerCase() === expectedEmail));

  function handleAvatarPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onChangeAvatar(file);
  }

  const [name, setName] = useState(displayName ?? '');
  const [nameLocalError, setNameLocalError] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState(email ?? '');
  const [emailLocalError, setEmailLocalError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordLocalError, setPasswordLocalError] = useState<string | null>(null);
  const [theme, setLocalTheme] = useState<ThemeName>(() => getTheme().theme);

  // El nombre del perfil llega de forma asíncrona (carga): se siembra el campo
  // durante el render cuando cambia (sin useEffect ni renders en cascada).
  const [seededFrom, setSeededFrom] = useState(displayName);
  if (displayName !== seededFrom) {
    setSeededFrom(displayName);
    setName(displayName ?? '');
  }

  // Mismo patrón para el email.
  const [seededEmail, setSeededEmail] = useState(email);
  if (email !== seededEmail) {
    setSeededEmail(email);
    setEmailValue(email ?? '');
  }

  const displayedNameError = nameLocalError ?? nameError ?? null;
  const displayedEmailError = emailLocalError ?? emailError ?? null;
  const displayedPasswordError = passwordLocalError ?? passwordError ?? null;

  function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameLocalError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameLocalError('El nombre no puede estar vacío.');
      return;
    }
    onSaveName(trimmed);
  }

  function handleChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailLocalError(null);
    const trimmed = emailValue.trim();
    if (!isValidEmail(trimmed)) {
      setEmailLocalError('Introduce un correo electrónico válido.');
      return;
    }
    if (trimmed === (email ?? '')) {
      setEmailLocalError('El correo es el mismo que ya tienes.');
      return;
    }
    onChangeEmail(trimmed);
  }

  function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordLocalError(null);
    if (password.length < 6) {
      setPasswordLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setPasswordLocalError('Las contraseñas no coinciden.');
      return;
    }
    onChangePassword(password);
    setPassword('');
    setConfirm('');
  }

  function handleTheme(t: ThemeName) {
    setTheme({ theme: t });
    setLocalTheme(t);
  }

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        <header className="text-center">
          <p className="ck-marker text-lg opacity-70">— tu cuaderno —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-primary">Ajustes</h1>
        </header>

        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <section className="ck-card p-5 space-y-3 relative">
          <span className="ck-tape" aria-hidden="true" />
          <h2 className="ck-marker text-2xl text-primary">Perfil</h2>

          {/* Foto de perfil: avatar actual (o placeholder) + subir/quitar. */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Tu foto de perfil"
                className="h-16 w-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <span
                aria-hidden="true"
                className="ck-marker flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-3xl text-primary"
              >
                {avatarInitial(displayName)}
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarPicked}
                aria-label="Elegir foto de perfil"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar || removingAvatar}
                className="ck-btn ck-btn-blue self-start disabled:opacity-60"
              >
                {uploadingAvatar ? 'subiendo…' : avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={uploadingAvatar || removingAvatar}
                  className="ck-marker text-lg text-primary self-start opacity-70 disabled:opacity-40"
                >
                  {removingAvatar ? 'quitando…' : 'quitar foto'}
                </button>
              )}
            </div>
          </div>
          {avatarError && (
            <div role="alert">
              <p className="text-base text-error">{avatarError}</p>
            </div>
          )}

          <form onSubmit={handleSaveName} noValidate className="space-y-3">
            <div>
              <label htmlFor="settings-name" className="ck-marker text-xl block">
                nombre
              </label>
              <input
                id="settings-name"
                className="ck-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="tu nombre"
                maxLength={80}
                disabled={loading || savingName}
              />
            </div>

            {displayedNameError && (
              <div role="alert">
                <p className="text-base text-error">{displayedNameError}</p>
              </div>
            )}
            {nameOk && !displayedNameError && (
              <p className="ck-marker text-xl text-success">¡Nombre actualizado!</p>
            )}

            <button
              type="submit"
              disabled={savingName || loading}
              className="ck-btn ck-btn-blue self-start disabled:opacity-60"
            >
              {savingName ? 'guardando…' : 'Guardar nombre'}
            </button>
          </form>

          {/* Cambio de email: separado porque requiere verificación por correo. */}
          <form onSubmit={handleChangeEmail} noValidate className="space-y-3 pt-2">
            <div>
              <label htmlFor="settings-email" className="ck-marker text-xl block">
                email
              </label>
              <input
                id="settings-email"
                className="ck-input"
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={loading || changingEmail}
              />
              <p className="text-sm opacity-70 mt-1">
                Al cambiarlo te enviaremos un correo de verificación. El cambio no se aplica hasta que
                lo confirmes.
              </p>
            </div>

            {displayedEmailError && (
              <div role="alert">
                <p className="text-base text-error">{displayedEmailError}</p>
              </div>
            )}
            {emailOk && !displayedEmailError && (
              <p className="ck-marker text-xl text-success">
                ¡Te hemos enviado un correo de verificación! Confírmalo para aplicar el cambio.
              </p>
            )}

            <button
              type="submit"
              disabled={changingEmail || loading}
              className="ck-btn ck-btn-blue self-start disabled:opacity-60"
            >
              {changingEmail ? 'enviando…' : 'Cambiar correo'}
            </button>
          </form>
        </section>

        {/* ── Contraseña ──────────────────────────────────────────────────── */}
        <section className="ck-card p-5 space-y-3">
          <h2 className="ck-marker text-2xl text-primary">Contraseña</h2>
          <form onSubmit={handleChangePassword} noValidate className="space-y-3">
            <div>
              <label htmlFor="settings-password" className="ck-marker text-xl block">
                nueva contraseña
              </label>
              <input
                id="settings-password"
                className="ck-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={changingPassword}
              />
            </div>

            <div>
              <label htmlFor="settings-confirm" className="ck-marker text-xl block">
                confirmar
              </label>
              <input
                id="settings-confirm"
                className="ck-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="repite la contraseña"
                autoComplete="new-password"
                disabled={changingPassword}
              />
            </div>

            {displayedPasswordError && (
              <div role="alert">
                <p className="text-base text-error">{displayedPasswordError}</p>
              </div>
            )}
            {passwordOk && !displayedPasswordError && (
              <p className="ck-marker text-xl text-success">¡Contraseña actualizada!</p>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="ck-btn ck-btn-blue self-start disabled:opacity-60"
            >
              {changingPassword ? 'guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

        {/* ── Familias ────────────────────────────────────────────────────── */}
        <section className="ck-card p-5 space-y-3">
          <h2 className="ck-marker text-2xl text-primary">Familias</h2>
          {families && families.length > 0 ? (
            <ul className="space-y-2">
              {families.map((f) => (
                <li key={f.id} className="ck-card p-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="ck-marker text-xl text-primary block truncate">{f.name}</span>
                    {f.active && <span className="text-sm opacity-70 block">familia activa</span>}
                  </span>
                  {f.active && (
                    <button
                      type="button"
                      onClick={() => onLeaveFamily(f.id)}
                      disabled={leavingFamily}
                      className="ck-btn ck-btn-red shrink-0 disabled:opacity-60"
                    >
                      {leavingFamily ? 'saliendo…' : 'Salir'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base opacity-70">No perteneces a ninguna familia.</p>
          )}

          {leaveError && (
            <div role="alert">
              <p className="text-base text-error">{leaveError}</p>
            </div>
          )}
        </section>

        {/* ── Apariencia ──────────────────────────────────────────────────── */}
        <section className="ck-card p-5 space-y-3">
          <h2 className="ck-marker text-2xl text-primary">Apariencia</h2>
          <p className="text-sm opacity-70">Elige el aspecto de la app.</p>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTheme(t.value)}
                  aria-pressed={active}
                  className={`ck-card p-3 text-left flex items-center gap-2 ${
                    active ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {t.emoji}
                  </span>
                  <span className="ck-marker text-xl text-primary leading-none">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Cerrar sesión ───────────────────────────────────────────────── */}
        <section className="ck-card p-5">
          <button type="button" onClick={onLogout} className="ck-btn ck-btn-red self-start">
            Cerrar sesión
          </button>
        </section>

        {/* ── Tus datos: derecho de acceso (GDPR) ─────────────────────────── */}
        <section className="ck-card p-5 space-y-3">
          <h2 className="ck-marker text-2xl text-primary">Tus datos</h2>
          <p className="text-base opacity-80">
            Descarga una copia de toda tu información en formato JSON.
          </p>

          {exportError && (
            <div role="alert">
              <p className="text-base text-error">{exportError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onExportData}
            disabled={exportingData}
            className="ck-btn ck-btn-blue self-start disabled:opacity-60"
          >
            {exportingData ? 'descargando…' : 'Descargar mis datos'}
          </button>
        </section>

        {/* ── Zona peligrosa: borrar cuenta ───────────────────────────────── */}
        <section className="ck-card p-5 space-y-3" style={{ borderColor: 'var(--color-error, #B23A3A)' }}>
          <h2 className="ck-marker text-2xl text-error">Zona peligrosa</h2>
          <p className="text-base opacity-80">
            Borrar tu cuenta es <strong>permanente</strong> y no se puede deshacer. Se eliminarán tus
            datos. Las familias que creaste con más miembros seguirán existiendo (otra persona pasará
            a gestionarlas); las que solo tuvieras tú se borrarán.
          </p>
          <div>
            <label htmlFor="delete-confirm" className="ck-marker text-xl block">
              escribe «{accountEmail ?? email ?? 'BORRAR'}» para confirmar
            </label>
            <input
              id="delete-confirm"
              className="ck-input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={accountEmail ?? email ?? 'BORRAR'}
              autoComplete="off"
              disabled={deletingAccount}
            />
          </div>

          {deleteAccountError && (
            <div role="alert">
              <p className="text-base text-error">{deleteAccountError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={!deleteEnabled || deletingAccount}
            className="ck-btn ck-btn-red self-start disabled:opacity-40"
          >
            {deletingAccount ? 'borrando…' : 'Borrar cuenta permanentemente'}
          </button>
        </section>
      </div>
    </div>
  );
}
