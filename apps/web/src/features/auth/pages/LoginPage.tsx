import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ThemeView } from '@/shared/theme/ThemeView';
import type { AuthViewProps } from '../views/types';
import { useAuthStore } from '../store/auth.store';

/**
 * Container de la pantalla de login (`auth_login`). Cablea `useAuthStore` y delega
 * el render en la vista del theme activo vía `ThemeView`. La lógica (signIn,
 * Google OAuth, navegación, captura de error, recuperación de contraseña) vive
 * aquí una sola vez; la vista es presentacional pura.
 */
export function LoginPage() {
  const { signIn, signInWithGoogle, resetPasswordForEmail, loading } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const props: AuthViewProps = {
    mode: 'login',
    isSubmitting: loading,
    error,
    resetEmailSent,
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
    onForgotPassword: async (email) => {
      setError(null);
      try {
        await resetPasswordForEmail(email);
        // Confirmación en la propia vista (consistente con el aviso de signup).
        setResetEmailSent(true);
      } catch (err) {
        // Error no-formulario: lo mostramos por toast, no rompemos el formulario.
        toast.error(
          err instanceof Error
            ? err.message
            : 'No hemos podido enviar el correo de recuperación. Inténtalo de nuevo.',
        );
      }
    },
  };

  return <ThemeView screen="auth_login" props={props} />;
}
