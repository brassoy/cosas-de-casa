/* ─── Vista presentacional springfield — settings ───────────────────────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos, hard shadows, colores planos
 * saturados). Misma funcionalidad que la base: Perfil (nombre + email editable),
 * Contraseña, Familias, Apariencia y cerrar sesión. Reestiliza con `sf-card`,
 * `sf-input`, `sf-bangers`/`sf-fredoka` y botones `sf-btn`.
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

  function handleAvatarPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onChangeAvatar(file);
  }

  // Zona peligrosa: confirmación FUERTE (escribir el email o "BORRAR").
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const expectedEmail = (accountEmail ?? email ?? '').trim().toLowerCase();
  const typedDelete = deleteConfirm.trim();
  const deleteEnabled =
    typedDelete.length > 0 &&
    (typedDelete.toUpperCase() === 'BORRAR' ||
      (expectedEmail !== '' && typedDelete.toLowerCase() === expectedEmail));

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
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        <header className="sf-card-y p-5 relative sf-pop">
          <span className="sf-sticker">¡Tu cuenta!</span>
          <h1 className="sf-bangers text-5xl leading-none mt-2">Ajustes</h1>
        </header>

        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Perfil</h2>

          {/* Foto de perfil: avatar actual (o placeholder) + subir/quitar. */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Tu foto de perfil"
                className="h-16 w-16 rounded-full object-cover border-[3px] border-black"
              />
            ) : (
              <span
                aria-hidden="true"
                className="sf-bangers flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black text-3xl"
                style={{ background: '#FFD90F' }}
              >
                {avatarInitial(displayName)}
              </span>
            )}
            <div className="flex flex-col gap-1.5 items-start">
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
                className="sf-btn text-lg disabled:opacity-60"
              >
                {uploadingAvatar ? 'Subiendo…' : avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={uploadingAvatar || removingAvatar}
                  className="sf-fredoka text-sm underline disabled:opacity-40"
                >
                  {removingAvatar ? 'Quitando…' : 'Quitar foto'}
                </button>
              )}
            </div>
          </div>
          {avatarError && (
            <div role="alert" className="sf-card-p p-3">
              <p className="sf-fredoka text-sm">{avatarError}</p>
            </div>
          )}

          <form onSubmit={handleSaveName} noValidate className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-name" className="sf-fredoka text-xs uppercase block">
                Nombre
              </label>
              <input
                id="settings-name"
                className="sf-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={80}
                disabled={loading || savingName}
              />
            </div>

            {displayedNameError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{displayedNameError}</p>
              </div>
            )}
            {nameOk && !displayedNameError && (
              <div role="status" className="sf-card-g p-3">
                <p className="sf-fredoka text-sm">¡Nombre actualizado!</p>
              </div>
            )}

            <button
              type="submit"
              disabled={savingName || loading}
              className="sf-btn text-lg disabled:opacity-60"
            >
              {savingName ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </form>

          {/* Cambio de email: separado porque requiere verificación por correo. */}
          <form onSubmit={handleChangeEmail} noValidate className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="settings-email" className="sf-fredoka text-xs uppercase block">
                Correo electrónico
              </label>
              <input
                id="settings-email"
                className="sf-input"
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={loading || changingEmail}
              />
              <p className="text-xs opacity-70">
                Al cambiarlo te enviaremos un correo de verificación. El cambio no se aplica hasta que
                lo confirmes.
              </p>
            </div>

            {displayedEmailError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{displayedEmailError}</p>
              </div>
            )}
            {emailOk && !displayedEmailError && (
              <div role="status" className="sf-card-g p-3">
                <p className="sf-fredoka text-sm">
                  ¡Te hemos enviado un correo de verificación! Confírmalo para aplicar el cambio.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={changingEmail || loading}
              className="sf-btn text-lg disabled:opacity-60"
            >
              {changingEmail ? 'Enviando…' : 'Cambiar correo'}
            </button>
          </form>
        </section>

        {/* ── Contraseña ──────────────────────────────────────────────────── */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Contraseña</h2>
          <form onSubmit={handleChangePassword} noValidate className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-password" className="sf-fredoka text-xs uppercase block">
                Nueva contraseña
              </label>
              <input
                id="settings-password"
                className="sf-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={changingPassword}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-confirm" className="sf-fredoka text-xs uppercase block">
                Confirmar contraseña
              </label>
              <input
                id="settings-confirm"
                className="sf-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                disabled={changingPassword}
              />
            </div>

            {displayedPasswordError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{displayedPasswordError}</p>
              </div>
            )}
            {passwordOk && !displayedPasswordError && (
              <div role="status" className="sf-card-g p-3">
                <p className="sf-fredoka text-sm">¡Contraseña actualizada!</p>
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="sf-btn text-lg disabled:opacity-60"
            >
              {changingPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

        {/* ── Familias ────────────────────────────────────────────────────── */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Familias</h2>
          {families && families.length > 0 ? (
            <ul className="space-y-2">
              {families.map((f) => (
                <li
                  key={f.id}
                  className="sf-card p-3 flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="sf-fredoka text-base block truncate">{f.name}</span>
                    {f.active && (
                      <span className="sf-fredoka text-xs uppercase opacity-70 block">
                        Familia activa
                      </span>
                    )}
                  </span>
                  {f.active && (
                    <button
                      type="button"
                      onClick={() => onLeaveFamily(f.id)}
                      disabled={leavingFamily}
                      className="sf-btn sf-btn-r text-lg shrink-0 disabled:opacity-60"
                    >
                      {leavingFamily ? 'Saliendo…' : 'Salir'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs opacity-70">No perteneces a ninguna familia.</p>
          )}

          {leaveError && (
            <div role="alert" className="sf-card-p p-3">
              <p className="sf-fredoka text-sm">{leaveError}</p>
            </div>
          )}
        </section>

        {/* ── Apariencia ──────────────────────────────────────────────────── */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Apariencia</h2>
          <p className="text-xs opacity-70">Elige el aspecto de la app.</p>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTheme(t.value)}
                  aria-pressed={active}
                  className={`sf-card p-3 text-left flex items-center gap-2 ${active ? 'sf-card-y' : ''}`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {t.emoji}
                  </span>
                  <span className="sf-fredoka text-sm leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Cerrar sesión ───────────────────────────────────────────────── */}
        <section className="sf-card p-4">
          <button type="button" onClick={onLogout} className="sf-btn sf-btn-r text-lg">
            Cerrar sesión
          </button>
        </section>

        {/* ── Tus datos: derecho de acceso (GDPR) ─────────────────────────── */}
        {/* Tarjeta blanca (sf-card) con texto oscuro: NO usar sf-card-g/-y aquí
            para no perder contraste, igual que el resto de secciones neutras. */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Tus datos</h2>
          <p className="sf-fredoka text-sm">
            Descarga una copia de toda tu información en formato JSON.
          </p>

          {exportError && (
            <div role="alert" className="sf-card-p p-3">
              <p className="sf-fredoka text-sm">{exportError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onExportData}
            disabled={exportingData}
            className="sf-btn text-lg disabled:opacity-60"
          >
            {exportingData ? 'Descargando…' : 'Descargar mis datos'}
          </button>
        </section>

        {/* ── Zona peligrosa: borrar cuenta ───────────────────────────────── */}
        <section className="sf-card-p p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Zona peligrosa</h2>
          <p className="sf-fredoka text-sm">
            Borrar tu cuenta es <strong>permanente</strong> y no se puede deshacer. Se eliminarán tus
            datos. Las familias que creaste con más miembros seguirán existiendo (otra persona pasará
            a gestionarlas); las que solo tuvieras tú se borrarán.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="delete-confirm" className="sf-fredoka text-xs uppercase block">
              Escribe «{accountEmail ?? email ?? 'BORRAR'}» para confirmar
            </label>
            <input
              id="delete-confirm"
              className="sf-input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={accountEmail ?? email ?? 'BORRAR'}
              autoComplete="off"
              disabled={deletingAccount}
            />
          </div>

          {deleteAccountError && (
            <div role="alert" className="sf-card p-3">
              <p className="sf-fredoka text-sm">{deleteAccountError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={!deleteEnabled || deletingAccount}
            className="sf-btn sf-btn-r text-lg disabled:opacity-40"
          >
            {deletingAccount ? 'Borrando…' : 'Borrar cuenta permanentemente'}
          </button>
        </section>
      </div>
    </div>
  );
}
