/* ─── Vista presentacional cozy — settings ──────────────────────────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel pautado, tinta marrón,
 * notas con cinta, fuentes Caveat/Patrick Hand). Misma funcionalidad que la
 * base: Perfil, Contraseña, Apariencia y cerrar sesión.
 *
 * Presentacional puro: props in / callbacks out. La validación de formulario
 * (nombre no vacío, contraseña ≥ 6 + confirmar) es UI y vive aquí; el error de
 * negocio llega por props.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { getTheme, setTheme, type ThemeName } from '@/shared/theme/theme-bootstrap';
import type { SettingsViewProps } from '../types';

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
    onSaveName,
    savingName,
    nameError,
    nameOk,
    onChangePassword,
    changingPassword,
    passwordError,
    passwordOk,
    onLogout,
  } = props;

  const [name, setName] = useState(displayName ?? '');
  const [nameLocalError, setNameLocalError] = useState<string | null>(null);
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

  const displayedNameError = nameLocalError ?? nameError ?? null;
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

            <div>
              <label htmlFor="settings-email" className="ck-marker text-xl block">
                email
              </label>
              <input
                id="settings-email"
                className="ck-input"
                type="email"
                value={email ?? ''}
                readOnly
                disabled
              />
              <p className="text-sm opacity-70 mt-1">El correo no se puede cambiar desde aquí.</p>
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
      </div>
    </div>
  );
}
