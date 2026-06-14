/* ─── Vista presentacional base — auth (login / signup) ─────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Porta el JSX de
 * /tmp/hogar-feliz/src/screens/auth.tsx adaptándolo a los componentes shadcn de
 * `@/shared/ui/*`. Cubre las dos pantallas (`auth_login`, `auth_signup`) según la
 * prop `mode`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. Mantiene la validación de formulario local (correo no vacío,
 * contraseña ≥ 6) que la lógica actual ya hacía en `AuthForm` y de la que dependen
 * los tests — esa validación es UI, no negocio. El error de negocio (credenciales,
 * registro) llega por la prop `error` desde el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
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
    <div className="min-h-[100dvh] grid place-items-center px-4 bg-background">
      <div className="w-full max-w-[420px] bg-card text-card-foreground rounded-card shadow-md border border-border p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold">{isLogin ? 'Inicia sesión' : 'Regístrate'}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? 'Vuelve a tu hogar digital.' : 'Empieza a organizar tu casa.'}
          </p>
        </div>

        {signupSuccess && (
          <Alert>
            <AlertDescription>Revisa tu correo para confirmar la cuenta.</AlertDescription>
          </Alert>
        )}

        {displayedError && (
          <Alert variant="destructive">
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
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
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? 'Cargando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>

        <div className="relative text-center text-xs text-muted-foreground">
          <span className="bg-card px-2 relative z-10">o</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={onGoogle}
          disabled={isSubmitting}
        >
          Continuar con Google
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={onSwitchMode}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
