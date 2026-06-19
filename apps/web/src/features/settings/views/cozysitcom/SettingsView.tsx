/* ─── Vista presentacional cozysitcom — settings ────────────────────────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Misma funcionalidad que la base: Perfil, Contraseña, Apariencia y cerrar
 * sesión. Reestiliza con `cz-frame`, `cz-input`, `cz-serif` y botones por modo.
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

            <div className="space-y-1.5">
              <label htmlFor="settings-email" className="text-xs font-bold uppercase opacity-70 block">
                Correo electrónico
              </label>
              <input
                id="settings-email"
                className="cz-input"
                type="email"
                value={email ?? ''}
                readOnly
                disabled
              />
              <p className="text-xs opacity-70">El correo no se puede cambiar desde aquí.</p>
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
      </div>
    </div>
  );
}
