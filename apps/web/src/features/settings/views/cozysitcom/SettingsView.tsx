/* ─── Vista presentacional cozysitcom — settings ────────────────────────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Misma funcionalidad que la base: Perfil (nombre + email editable), Contraseña,
 * Familias, Apariencia y cerrar sesión. Reestiliza con `cz-frame`, `cz-input`,
 * `cz-serif` y botones por modo.
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
    <div className="cz min-h-[80dvh] px-5 py-8" style={{ background: '#FFF8EA' }}>
      <div className="max-w-[640px] mx-auto space-y-8">
        <header className="cz-pop">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">Tu cuenta</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">Ajustes</h1>
          <div className="cz-stripe mt-3" />
        </header>

        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <section className="cz-frame space-y-3">
          <h2 className="cz-serif text-2xl">Perfil</h2>

          {/* Foto de perfil: avatar actual (o placeholder) + subir/quitar. */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Tu foto de perfil"
                className="h-16 w-16 rounded-full object-cover"
                style={{ border: '3px solid #2F5D8C' }}
              />
            ) : (
              <span
                aria-hidden="true"
                className="cz-serif flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                style={{ border: '3px solid #2F5D8C', background: '#FFF8EA' }}
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
                className="cz-btn-denim disabled:opacity-60"
              >
                {uploadingAvatar ? 'Subiendo…' : avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={uploadingAvatar || removingAvatar}
                  className="cz-serif text-sm opacity-70 disabled:opacity-40"
                >
                  {removingAvatar ? 'Quitando…' : 'Quitar foto'}
                </button>
              )}
            </div>
          </div>
          {avatarError && (
            <div role="alert" style={{ color: '#A63A3A' }}>
              <p className="font-bold text-sm">{avatarError}</p>
            </div>
          )}

          <form onSubmit={handleSaveName} noValidate className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-name" className="text-xs font-bold uppercase opacity-70 block">
                Nombre
              </label>
              <input
                id="settings-name"
                className="cz-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={80}
                disabled={loading || savingName}
              />
            </div>

            {displayedNameError && (
              <div role="alert" style={{ color: '#A63A3A' }}>
                <p className="font-bold text-sm">{displayedNameError}</p>
              </div>
            )}
            {nameOk && !displayedNameError && (
              <p className="cz-serif text-sm" style={{ color: '#5F7A4F' }}>
                Nombre actualizado.
              </p>
            )}

            <button
              type="submit"
              disabled={savingName || loading}
              className="cz-btn-denim disabled:opacity-60"
            >
              {savingName ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </form>

          {/* Cambio de email: separado porque requiere verificación por correo. */}
          <form onSubmit={handleChangeEmail} noValidate className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="settings-email" className="text-xs font-bold uppercase opacity-70 block">
                Correo electrónico
              </label>
              <input
                id="settings-email"
                className="cz-input"
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
              <div role="alert" style={{ color: '#A63A3A' }}>
                <p className="font-bold text-sm">{displayedEmailError}</p>
              </div>
            )}
            {emailOk && !displayedEmailError && (
              <p className="cz-serif text-sm" style={{ color: '#5F7A4F' }}>
                Te hemos enviado un correo de verificación. Confírmalo para aplicar el cambio.
              </p>
            )}

            <button
              type="submit"
              disabled={changingEmail || loading}
              className="cz-btn-denim disabled:opacity-60"
            >
              {changingEmail ? 'Enviando…' : 'Cambiar correo'}
            </button>
          </form>
        </section>

        {/* ── Contraseña ──────────────────────────────────────────────────── */}
        <section className="cz-frame space-y-3">
          <h2 className="cz-serif text-2xl">Contraseña</h2>
          <form onSubmit={handleChangePassword} noValidate className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-password" className="text-xs font-bold uppercase opacity-70 block">
                Nueva contraseña
              </label>
              <input
                id="settings-password"
                className="cz-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={changingPassword}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-confirm" className="text-xs font-bold uppercase opacity-70 block">
                Confirmar contraseña
              </label>
              <input
                id="settings-confirm"
                className="cz-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                disabled={changingPassword}
              />
            </div>

            {displayedPasswordError && (
              <div role="alert" style={{ color: '#A63A3A' }}>
                <p className="font-bold text-sm">{displayedPasswordError}</p>
              </div>
            )}
            {passwordOk && !displayedPasswordError && (
              <p className="cz-serif text-sm" style={{ color: '#5F7A4F' }}>
                Contraseña actualizada.
              </p>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="cz-btn-denim disabled:opacity-60"
            >
              {changingPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

        {/* ── Familias ────────────────────────────────────────────────────── */}
        <section className="cz-frame space-y-3">
          <h2 className="cz-serif text-2xl">Familias</h2>
          {families && families.length > 0 ? (
            <ul className="space-y-2">
              {families.map((f) => (
                <li key={f.id} className="cz-frame flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="cz-serif text-lg block truncate">{f.name}</span>
                    {f.active && (
                      <span className="text-xs font-bold uppercase opacity-70 block">
                        Familia activa
                      </span>
                    )}
                  </span>
                  {f.active && (
                    <button
                      type="button"
                      onClick={() => onLeaveFamily(f.id)}
                      disabled={leavingFamily}
                      className="cz-btn-garnet shrink-0 disabled:opacity-60"
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
            <div role="alert" style={{ color: '#A63A3A' }}>
              <p className="font-bold text-sm">{leaveError}</p>
            </div>
          )}
        </section>

        {/* ── Apariencia ──────────────────────────────────────────────────── */}
        <section className="cz-frame space-y-3">
          <h2 className="cz-serif text-2xl">Apariencia</h2>
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
                  className="cz-frame text-left flex items-center gap-2"
                  style={active ? { outline: '3px solid #2F5D8C', outlineOffset: '2px' } : undefined}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {t.emoji}
                  </span>
                  <span className="cz-serif text-sm leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Cerrar sesión ───────────────────────────────────────────────── */}
        <section className="cz-frame">
          <button type="button" onClick={onLogout} className="cz-btn-garnet">
            Cerrar sesión
          </button>
        </section>

        {/* ── Zona peligrosa: borrar cuenta ───────────────────────────────── */}
        <section className="cz-frame space-y-3" style={{ borderColor: '#A63A3A' }}>
          <h2 className="cz-serif text-2xl" style={{ color: '#A63A3A' }}>
            Zona peligrosa
          </h2>
          <p className="text-sm opacity-80">
            Borrar tu cuenta es <strong>permanente</strong> y no se puede deshacer. Se eliminarán tus
            datos. Las familias que creaste con más miembros seguirán existiendo (otra persona pasará
            a gestionarlas); las que solo tuvieras tú se borrarán.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="delete-confirm" className="text-xs font-bold uppercase opacity-70 block">
              Escribe «{accountEmail ?? email ?? 'BORRAR'}» para confirmar
            </label>
            <input
              id="delete-confirm"
              className="cz-input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={accountEmail ?? email ?? 'BORRAR'}
              autoComplete="off"
              disabled={deletingAccount}
            />
          </div>

          {deleteAccountError && (
            <div role="alert" style={{ color: '#A63A3A' }}>
              <p className="font-bold text-sm">{deleteAccountError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={!deleteEnabled || deletingAccount}
            className="cz-btn-garnet disabled:opacity-40"
          >
            {deletingAccount ? 'Borrando…' : 'Borrar cuenta permanentemente'}
          </button>
        </section>
      </div>
    </div>
  );
}
