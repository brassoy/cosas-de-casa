import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import type { AuthViewProps } from '../views/types';
import { useAuthStore } from '../store/auth.store';

/**
 * Container de la pantalla de login (`auth_login`). Cablea `useAuthStore` y delega
 * el render en la vista del theme activo vía `ThemeView`. La lógica (signIn,
 * Google OAuth, navegación, captura de error) vive aquí una sola vez; la vista es
 * presentacional pura.
 */
export function LoginPage() {
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const props: AuthViewProps = {
    mode: 'login',
    isSubmitting: loading,
    error,
    onSubmit: async ({ email, password }) => {
      setError(null);
      try {
        await signIn(email, password);
        // La redirección real la gestiona el router guard; esto es un fallback.
        await navigate({ to: '/' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ha ocurrido un error. Inténtalo de nuevo.');
      }
    },
    onGoogle: signInWithGoogle,
    onSwitchMode: () => {
      void navigate({ to: '/signup' });
    },
  };

  return <ThemeView screen="auth_login" props={props} />;
}
