/* ─── Vista presentacional — recuperación de contraseña ─────────────────────
 *
 * Pantalla a la que llega el usuario desde el enlace del correo de recuperación
 * (Supabase deja una sesión de recuperación al volver a `/reset-password`).
 *
 * A diferencia de `auth_login` / `auth_signup`, esta pantalla NO se temifica por
 * theme registry: es un flujo de recuperación puntual, así que una única versión
 * con el kit base (shadcn) basta y mantiene consistencia visual mínima con el
 * login base. Presentacional pura: validación de UI local (≥ 6 + confirmar) y el
 * resto por props/callbacks; el error de negocio llega por la prop `error`.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';

export interface ResetPasswordViewProps {
  /** Hay sesión de recuperación válida (el usuario llegó desde el enlace). */
  hasRecoverySession: boolean;
  /** El submit está en curso. */
  isSubmitting?: boolean;
  /** Mensaje de error de negocio a mostrar (p. ej. fallo de Supabase). */
  error?: string | null;
  /** Envío con la nueva contraseña ya validada por la vista. */
  onSubmit: (password: string) => void | Promise<void>;
}

export default function ResetPasswordView(props: ResetPasswordViewProps) {
  const { hasRecoverySession, isSubmitting, error, onSubmit } = props;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError ?? error ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    void onSubmit(password);
  }

  return (
    <div className="min-h-[100dvh] flex justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-[420px] bg-card text-card-foreground rounded-card shadow-md border border-border p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold">Nueva contraseña</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Elige una contraseña nueva para tu cuenta.
          </p>
        </div>

        {!hasRecoverySession ? (
          <>
            <Alert variant="destructive">
              <AlertDescription>
                Este enlace de recuperación no es válido o ha caducado. Vuelve a solicitar el correo
                desde la pantalla de inicio de sesión.
              </AlertDescription>
            </Alert>
            <a
              href="/login"
              className="block text-center text-sm text-primary font-medium hover:underline"
            >
              Ir a iniciar sesión
            </a>
          </>
        ) : (
          <>
            {displayedError && (
              <Alert variant="destructive">
                <AlertDescription>{displayedError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Repite la contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Vuelve a escribirla"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
