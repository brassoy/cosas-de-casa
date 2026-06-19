/* ─── Vista presentacional cozy — auth (login / signup) ──────────────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel crema pautado, tinta
 * marrón, boli azul, notas pegadas con cinta y chinchetas, fuentes manuscritas
 * Caveat/Patrick Hand). Reestiliza la vista base con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozy.tsx → Login / Signup): página con
 * fondo pautado (`ck-page`), cabecera manuscrita (`ck-marker`) con el sello del
 * "diario de la casa", formulario dentro de una hoja de papel (`ck-card`) sujeta
 * con cinta (`ck-tape`), campos `ck-input` (línea de puntos azul) con label
 * manuscrito, y botón pill `ck-btn` (azul en login, rojo `ck-btn-red` en signup).
 *
 * Mismo contrato `AuthViewProps`, misma funcionalidad y mismos callbacks que la
 * base: cubre `auth_login` y `auth_signup` según la prop `mode`. Presentacional
 * puro (props in / callbacks out, estado de UI local). Conserva la validación de
 * formulario local (correo no vacío, contraseña ≥ 6) que ya hacía la base y de la
 * que dependen los tests; el error de negocio llega por la prop `error`.
 *
 * Notas sobre la maqueta:
 *  - El Signup del kit incluía un campo "nombre" y un check "acepto las
 *    condiciones" que NO están en el contrato (el flujo real es email +
 *    contraseña por Supabase). Se omiten a propósito para no insinuar
 *    funcionalidad inexistente.
 *  - La maqueta no tenía botón de Google ni avisos de error/confirmación: se
 *    añaden con la estética del theme (botón `ck-btn`, hojas `ck-card`) porque sí
 *    forman parte del contrato real.
 *  - Los valores `defaultValue` mock del kit (marta@example.com, etc.) se
 *    sustituyen por estado controlado real (placeholders), sin datos inventados.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import type { AuthViewProps } from '../types';

export default function AuthView(props: AuthViewProps) {
  const {
    mode,
    isSubmitting,
    error,
    signupSuccess,
    resetEmailSent,
    onSubmit,
    onGoogle,
    onSwitchMode,
    onForgotPassword,
  } = props;
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // El error a mostrar: prioriza la validación local del formulario; si no, el
  // error de negocio que llega del container.
  const displayedError = localError ?? error ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('El correo electrónico es obligatorio.');
      return;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    void onSubmit({ email: email.trim(), password });
  }

  // "He olvidado mi contraseña": solo necesita el email.
  function handleForgotPassword() {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Escribe tu correo electrónico para recuperar la contraseña.');
      return;
    }
    void onForgotPassword?.(email.trim());
  }

  return (
    <div className="ck ck-page min-h-[100dvh] px-5 py-8">
      <div className="w-full max-w-[420px] mx-auto">
        {/* Cabecera manuscrita estilo "diario de la casa" (kit cozy). */}
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1
            className="ck-marker text-5xl leading-none mt-1"
            style={{ color: 'var(--color-accent)' }}
          >
            {isLogin ? '¡hola!' : 'abre tu cuaderno'}
          </h1>
          <p className="text-base mt-2 opacity-80">
            {isLogin ? 'entra a tu cuaderno' : 'empieza a organizar tu casa'}
          </p>
        </header>

        {signupSuccess && (
          <div className="ck-card p-4 mb-4" role="alert">
            <span className="ck-tape" />
            <p className="ck-marker text-xl" style={{ color: 'var(--color-success)' }}>
              ¡casi!
            </p>
            <p className="text-base mt-1">Revisa tu correo para confirmar la cuenta.</p>
          </div>
        )}

        {resetEmailSent && (
          <div className="ck-card p-4 mb-4" role="alert">
            <span className="ck-tape" />
            <p className="ck-marker text-xl" style={{ color: 'var(--color-success)' }}>
              ¡correo enviado!
            </p>
            <p className="text-base mt-1">
              Te hemos enviado un correo para restablecer tu contraseña. Revisa tu bandeja.
            </p>
          </div>
        )}

        {displayedError && (
          <div className="ck-card p-4 mb-4" role="alert">
            <span className="ck-tape" style={{ background: 'rgba(255, 150, 150, 0.6)' }} />
            <p className="ck-marker text-xl" style={{ color: 'var(--color-error)' }}>
              uy…
            </p>
            <p className="text-base mt-1" style={{ color: 'var(--color-error)' }}>
              {displayedError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="ck-card p-5 space-y-4">
          <span className="ck-tape" />

          <div>
            <label htmlFor="email" className="ck-marker text-xl block">
              email
            </label>
            <input
              id="email"
              className="ck-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="ck-marker text-xl block">
              contraseña
            </label>
            <input
              id="password"
              className="ck-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              disabled={isSubmitting}
            />
          </div>

          {isLogin && onForgotPassword && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSubmitting}
                className="ck-marker text-base underline opacity-80 disabled:opacity-50"
              >
                he olvidado mi contraseña
              </button>
            </div>
          )}

          <button
            type="submit"
            className={`ck-btn ${isLogin ? 'ck-btn-blue' : 'ck-btn-red'} w-full disabled:opacity-60`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'cargando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>

          {/* Separador manuscrito a mano (línea de puntos + "o"). */}
          <div className="flex items-center gap-3 py-1">
            <span
              className="flex-1 border-b border-dashed"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <span className="ck-marker text-lg opacity-70">o</span>
            <span
              className="flex-1 border-b border-dashed"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>

          <button
            type="button"
            className="ck-btn w-full disabled:opacity-60"
            onClick={onGoogle}
            disabled={isSubmitting}
          >
            Continuar con Google
          </button>

          <p className="text-center text-sm opacity-70">
            {isLogin ? '¿sin cuenta?' : '¿ya tienes cuenta?'}{' '}
            <button type="button" onClick={onSwitchMode} className="underline">
              {isLogin ? 'regístrate' : 'inicia sesión'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
