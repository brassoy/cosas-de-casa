/* ─── Vista presentacional base — settings ──────────────────────────────────
 *
 * Theme `base` (estética shadcn). Pantalla de ajustes del usuario con cuatro
 * secciones — Perfil (nombre + email editable con verificación), Contraseña
 * (nueva + confirmar), Familias (familia activa + salir) y Apariencia (selector
 * de theme) — más un botón de cerrar sesión.
 *
 * Presentacional puro: solo props in / callbacks out. La validación de los
 * formularios (nombre no vacío, email con formato, contraseña ≥ 6 + confirmación)
 * es UI y vive aquí; el error de negocio (backend / Supabase) llega por props
 * desde el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { getTheme, setTheme, type ThemeName } from '@/shared/theme/theme-bootstrap';
import { isValidEmail, type SettingsViewProps } from '../types';

const THEMES: { value: ThemeName; label: string; emoji: string; description: string }[] = [
  { value: 'base', label: 'Clásico', emoji: '◉', description: 'Limpio y neutro (shadcn)' },
  { value: 'cozy', label: 'Cuaderno', emoji: '✎', description: 'Papel pautado, manuscrito' },
  { value: 'cozysitcom', label: 'Sitcom 70s', emoji: '📺', description: 'Retro cálido, madera y mostaza' },
  { value: 'springfield', label: 'Hommer', emoji: '🍩', description: 'Amarillo pop, bordes gruesos' },
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
  } = props;

  const [name, setName] = useState(displayName ?? '');
  const [nameLocalError, setNameLocalError] = useState<string | null>(null);

  const [emailValue, setEmailValue] = useState(email ?? '');
  const [emailLocalError, setEmailLocalError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordLocalError, setPasswordLocalError] = useState<string | null>(null);

  const [theme, setLocalTheme] = useState<ThemeName>(() => getTheme().theme);

  // El nombre del perfil llega de forma asíncrona (carga). Cuando cambia, se
  // siembra el campo durante el render (patrón recomendado de React para ajustar
  // estado al cambiar una prop, sin useEffect ni renders en cascada).
  const [seededFrom, setSeededFrom] = useState(displayName);
  if (displayName !== seededFrom) {
    setSeededFrom(displayName);
    setName(displayName ?? '');
  }

  // Mismo patrón para el email (siembra el campo al cargar el perfil).
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
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <header className="border-b border-border pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tu cuenta</p>
        <h1 className="text-2xl font-bold">Ajustes</h1>
      </header>

      {/* ── Perfil ──────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-semibold">Perfil</h2>
        <form onSubmit={handleSaveName} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Nombre</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={80}
              disabled={loading || savingName}
            />
          </div>

          {displayedNameError && (
            <Alert variant="destructive">
              <AlertDescription>{displayedNameError}</AlertDescription>
            </Alert>
          )}
          {nameOk && !displayedNameError && (
            <Alert>
              <AlertDescription>Nombre actualizado.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={savingName || loading} className="h-11">
            {savingName ? 'Guardando…' : 'Guardar nombre'}
          </Button>
        </form>

        {/* Cambio de email: separado del nombre porque requiere verificación. */}
        <form onSubmit={handleChangeEmail} noValidate className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Correo electrónico</Label>
            <Input
              id="settings-email"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              disabled={loading || changingEmail}
            />
            <p className="text-xs text-muted-foreground">
              Al cambiarlo, te enviaremos un correo de verificación. El cambio no se aplica hasta que lo
              confirmes.
            </p>
          </div>

          {displayedEmailError && (
            <Alert variant="destructive">
              <AlertDescription>{displayedEmailError}</AlertDescription>
            </Alert>
          )}
          {emailOk && !displayedEmailError && (
            <Alert>
              <AlertDescription>
                Te hemos enviado un correo de verificación. Revisa tu bandeja para confirmar el cambio.
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={changingEmail || loading} className="h-11">
            {changingEmail ? 'Enviando…' : 'Cambiar correo'}
          </Button>
        </form>
      </section>

      {/* ── Contraseña ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-semibold">Contraseña</h2>
        <form onSubmit={handleChangePassword} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-password">Nueva contraseña</Label>
            <Input
              id="settings-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              disabled={changingPassword}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-confirm">Confirmar contraseña</Label>
            <Input
              id="settings-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              disabled={changingPassword}
            />
          </div>

          {displayedPasswordError && (
            <Alert variant="destructive">
              <AlertDescription>{displayedPasswordError}</AlertDescription>
            </Alert>
          )}
          {passwordOk && !displayedPasswordError && (
            <Alert>
              <AlertDescription>Contraseña actualizada.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={changingPassword} className="h-11">
            {changingPassword ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </section>

      {/* ── Familias ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-semibold">Familias</h2>
        {families && families.length > 0 ? (
          <ul className="space-y-2">
            {families.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{f.name}</span>
                  {f.active && (
                    <span className="block text-xs text-muted-foreground">Familia activa</span>
                  )}
                </span>
                {f.active && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onLeaveFamily(f.id)}
                    disabled={leavingFamily}
                    className="h-10 shrink-0"
                  >
                    {leavingFamily ? 'Saliendo…' : 'Salir'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No perteneces a ninguna familia.</p>
        )}

        {leaveError && (
          <Alert variant="destructive">
            <AlertDescription>{leaveError}</AlertDescription>
          </Alert>
        )}
      </section>

      {/* ── Apariencia ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-semibold">Apariencia</h2>
        <p className="text-sm text-muted-foreground">Elige el aspecto de la app.</p>
        <div className="grid gap-2">
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTheme(t.value)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-card border p-3 text-left transition ${
                  active ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-accent'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {t.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Cerrar sesión ───────────────────────────────────────────────── */}
      <section className="border-t border-border pt-6">
        <Button variant="destructive" onClick={onLogout} className="h-11">
          Cerrar sesión
        </Button>
      </section>
    </div>
  );
}
