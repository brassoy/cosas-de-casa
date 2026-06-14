/* ─── Vista presentacional springfield — auth (login / signup) ───────────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos de tinta, hard shadows con
 * offset, colores planos saturados). Reestiliza la vista base con la estética
 * del kit estático (/tmp/hogar-feliz/src/screens/themes/springfield.tsx →
 * Login / Signup): cabecera `sf-card-y` con titular Bangers + subtítulo Fredoka
 * y rayo decorativo, formulario en `sf-card` con labels `sf-fredoka`, campos
 * `sf-input` y botón primario `sf-btn` (amarillo en login, rojo `sf-btn-r` en
 * signup). El login muestra además el panel informativo celeste (`sf-card-s`)
 * con un donut, igual que la maqueta.
 *
 * Mismo contrato `AuthViewProps`, misma funcionalidad y mismos callbacks que la
 * base: cubre `auth_login` y `auth_signup` según la prop `mode`. Presentacional
 * puro (props in / callbacks out). Conserva la validación de formulario local
 * (correo no vacío, contraseña ≥ 6) que ya hacía la base y de la que dependen
 * los tests; el error de negocio llega por la prop `error`.
 *
 * Nota sobre la maqueta: el Signup del kit incluía un campo "Nombre" y un check
 * "Acepto las condiciones" que NO están en el contrato (el flujo real es email
 * + contraseña por Supabase). Se omiten a propósito para no insinuar
 * funcionalidad inexistente — la estética se mantiene con el resto de clases.
 * Los SVG decorativos (rayo, donut) son inline y presentacionales (sin lógica).
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, type SVGProps, useState } from 'react';
import type { AuthViewProps } from '../types';

/* Rayo amarillo de cómic — decorativo (cabecera). */
function Lightning(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" {...props}>
      <path
        d="M14 0 L2 18 H10 L8 32 L22 12 H14 Z"
        fill="#FFD90F"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Donut de cómic — decorativo (panel informativo del login). */
function Donut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <circle cx="24" cy="24" r="20" fill="#F48FB1" stroke="#1A1A1A" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" fill="#FFF3C4" stroke="#1A1A1A" strokeWidth="3" />
      {(
        [
          ['10', '16'],
          ['32', '12'],
          ['36', '28'],
          ['18', '34'],
          ['28', '36'],
        ] as const
      ).map(([x, y], i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="4"
          height="2"
          fill="#7CB342"
          transform={`rotate(${i * 30} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

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
      className={`sf min-h-[100dvh] px-5 py-8 ${isLogin ? '' : 'sf-dot'}`}
      style={{ background: isLogin ? 'var(--color-surface)' : 'var(--color-info)' }}
    >
      <div className="w-full max-w-[520px] mx-auto">
        {/* Cabecera estilo kit: tarjeta amarilla + titular Bangers + rayo. */}
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <h1 className="sf-bangers text-4xl leading-none mt-1">
            {isLogin ? '¡Hola otra vez!' : '¡Bienvenida!'}
          </h1>
          <p className="sf-fredoka text-sm mt-1">
            {isLogin ? 'Entra a tu casa' : 'Crea tu cuenta en 30 segundos'}
          </p>
          <Lightning className="absolute -top-3 right-3 w-7 sf-wob" />
        </header>

        {signupSuccess && (
          <div role="alert" className="sf-card-g p-3 mb-4 sf-pop sf-fredoka text-sm">
            Revisa tu correo para confirmar la cuenta.
          </div>
        )}

        {displayedError && (
          <div
            role="alert"
            className="sf-card p-3 mb-4 sf-pop sf-fredoka text-sm"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          >
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="sf-card p-5 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="sf-fredoka text-xs uppercase block">
              Correo electrónico
            </label>
            <input
              id="email"
              className="sf-input"
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
            <label htmlFor="password" className="sf-fredoka text-xs uppercase block">
              Contraseña
            </label>
            <input
              id="password"
              className="sf-input"
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
            className={`sf-btn ${isLogin ? '' : 'sf-btn-r'} w-full text-lg mt-2 disabled:opacity-60`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cargando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="sf-zig flex-1 rounded" />
            <span className="sf-fredoka text-xs">o</span>
            <span className="sf-zig flex-1 rounded" />
          </div>

          <button
            type="button"
            className="sf-btn sf-btn-w w-full disabled:opacity-60"
            onClick={onGoogle}
            disabled={isSubmitting}
            aria-label="Continuar con Google"
          >
            Continuar con Google
          </button>

          <p className="text-center sf-fredoka text-xs mt-2">
            {isLogin ? '¿Sin cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button type="button" onClick={onSwitchMode} className="underline">
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </form>

        {/* Panel informativo del login (igual que la maqueta del kit). */}
        {isLogin && (
          <div className="sf-card-s p-4 mt-5 flex items-center gap-3">
            <Donut className="w-10 sf-wob" />
            <p className="sf-fredoka text-sm">¡Te echamos de menos en la cocina!</p>
          </div>
        )}
      </div>
    </div>
  );
}
