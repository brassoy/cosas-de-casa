/* ─── Vista presentacional cozysitcom — auth (login / signup) ────────────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Reestiliza la vista base con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozysitcom.tsx → Login / Signup):
 * cabecera con placa de madera + titular serif + cinta a rayas, formulario en
 * `cz-frame` con `cz-input` y botón primario por modo (denim en login, granate
 * en signup). El fondo de papel pintado (`cz-wallpaper`) se reserva a signup,
 * igual que en la maqueta.
 *
 * Mismo contrato `AuthViewProps`, misma funcionalidad y mismos callbacks que la
 * base: cubre `auth_login` y `auth_signup` según la prop `mode`. Presentacional
 * puro (props in / callbacks out). Conserva la validación de formulario local
 * (correo no vacío, contraseña ≥ 6) que ya hacía la base y de la que dependen
 * los tests; el error de negocio llega por la prop `error`.
 *
 * Nota sobre la maqueta: el Signup del kit incluía un campo "Nombre" y un check
 * "Acepto condiciones" que NO están en el contrato (el flujo real es email +
 * contraseña por Supabase). Se omiten a propósito para no insinuar
 * funcionalidad inexistente — la estética se mantiene con el resto de clases.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import type { AuthViewProps } from '../types';

export default function AuthView(props: AuthViewProps) {
  const { mode, isSubmitting, error, signupSuccess, onSubmit, onGoogle, onSwitchMode } = props;
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

  return (
    <div
      className={`cz min-h-[100dvh] px-4 py-10 ${isLogin ? '' : 'cz-wallpaper'}`}
      style={isLogin ? { background: 'var(--color-surface)' } : undefined}
    >
      <div className="w-full max-w-[520px] mx-auto">
        {/* Cabecera estilo kit: placa de madera + titular serif + cinta. */}
        <header className="mb-5 cz-pop">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">En esta casa</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">
            {isLogin ? '¡Hola otra vez!' : 'Crea tu cuenta'}
          </h1>
          <p className="text-sm opacity-70 mt-1">
            {isLogin ? 'Entra a tu casa.' : 'Bienvenida al barrio.'}
          </p>
          <div className="cz-stripe mt-3" />
        </header>

        {signupSuccess && (
          <div role="alert" className="cz-paper p-3 mb-3 cz-pop text-sm font-bold">
            Revisa tu correo para confirmar la cuenta.
          </div>
        )}

        {displayedError && (
          <div
            role="alert"
            className="cz-paper p-3 mb-3 cz-pop text-sm font-bold"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          >
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="cz-frame space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-bold uppercase opacity-70 block"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              className="cz-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-bold uppercase opacity-70 block"
            >
              Contraseña
            </label>
            <input
              id="password"
              className="cz-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className={`${isLogin ? 'cz-btn-denim' : 'cz-btn-garnet'} w-full disabled:opacity-60`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cargando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="cz-divider flex-1" />
            <span className="text-xs opacity-70 font-bold">o</span>
            <span className="cz-divider flex-1" />
          </div>

          <button
            type="button"
            className="cz-btn-ghost w-full disabled:opacity-60"
            onClick={onGoogle}
            disabled={isSubmitting}
          >
            Continuar con Google
          </button>
        </form>

        <p className="text-center text-xs opacity-70 mt-4">
          {isLogin ? '¿Sin cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={onSwitchMode}
            className="underline font-bold"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
