/* ─── Vista presentacional springfield — settings ───────────────────────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos, hard shadows, colores planos
 * saturados). Misma funcionalidad que la base: Perfil, Contraseña, Apariencia y
 * cerrar sesión. Reestiliza con `sf-card`, `sf-input`, `sf-bangers`/`sf-fredoka`
 * y botones `sf-btn`.
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
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        <header className="sf-card-y p-5 relative sf-pop">
          <span className="sf-sticker">¡Tu cuenta!</span>
          <h1 className="sf-bangers text-5xl leading-none mt-2">Ajustes</h1>
        </header>

        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <section className="sf-card p-4 space-y-3">
          <h2 className="sf-bangers text-2xl">Perfil</h2>
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

            <div className="space-y-1.5">
              <label htmlFor="settings-email" className="sf-fredoka text-xs uppercase block">
                Correo electrónico
              </label>
              <input
                id="settings-email"
                className="sf-input"
                type="email"
                value={email ?? ''}
                readOnly
                disabled
              />
              <p className="text-xs opacity-70">El correo no se puede cambiar desde aquí.</p>
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
      </div>
    </div>
  );
}
