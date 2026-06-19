import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '../store/auth.store';
import ResetPasswordView from '../views/ResetPasswordView';

/**
 * Container de la pantalla de recuperación (`/reset-password`). Es el callback
 * del enlace que Supabase envía por correo: al llegar, Supabase establece una
 * sesión de recuperación (evento `PASSWORD_RECOVERY`) y dispara `signedIn` en el
 * ciclo de vida normal, que `useAuthStore` ya recoge.
 *
 * Detectamos la sesión de recuperación esperando a `ready` y comprobando que hay
 * sesión; además escuchamos `PASSWORD_RECOVERY` por si el evento llega tarde
 * (token aún en proceso de canje desde el hash de la URL).
 *
 * No se temifica por theme: una sola vista (`ResetPasswordView`) con el kit base.
 */
export function ResetPasswordPage() {
  const { updatePassword } = useAuthStore();
  const navigate = useNavigate();

  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // 1) Estado inicial: esperamos a que el store conozca la sesión y leemos si
    //    Supabase ya canjeó el token del enlace en una sesión de recuperación.
    void useAuthStore
      .getState()
      .ready.then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (!active) return;
        if (data.session) setHasRecoverySession(true);
        setResolved(true);
      })
      .catch(() => {
        if (active) setResolved(true);
      });

    // 2) Por si el evento de recuperación llega después del primer render.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasRecoverySession(true);
        setResolved(true);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(password: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast.success('Tu contraseña se ha actualizado. ¡Bienvenido de nuevo!');
      await navigate({ to: '/' });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No hemos podido actualizar la contraseña. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ResetPasswordView
      // Mientras resolvemos, asumimos que SÍ hay sesión para no parpadear el
      // mensaje de "enlace no válido"; si al resolver no la hay, se muestra.
      hasRecoverySession={hasRecoverySession || !resolved}
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
    />
  );
}
