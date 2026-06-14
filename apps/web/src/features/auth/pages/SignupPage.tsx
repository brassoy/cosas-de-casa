import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import type { AuthViewProps } from '../views/types';
import { useAuthStore } from '../store/auth.store';

/**
 * Container de la pantalla de registro (`auth_signup`). Cablea `useAuthStore` y
 * delega el render en la vista del theme activo vía `ThemeView`.
 *
 * Supabase exige confirmar el email por defecto: tras `signUp` mostramos el aviso
 * (`signupSuccess`) y redirigimos al login tras un breve margen para que el
 * usuario lo lea.
 */
export function SignupPage() {
  const { signUp, signInWithGoogle, loading } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const props: AuthViewProps = {
    mode: 'signup',
    isSubmitting: loading,
    error,
    signupSuccess,
    onSubmit: async ({ email, password }) => {
      setError(null);
      try {
        await signUp(email, password);
        // Email confirmation: avisamos y redirigimos al login con margen de lectura.
        setSignupSuccess(true);
        setTimeout(() => {
          void navigate({ to: '/login' });
        }, 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ha ocurrido un error. Inténtalo de nuevo.');
      }
    },
    onGoogle: signInWithGoogle,
    onSwitchMode: () => {
      void navigate({ to: '/login' });
    },
  };

  return <ThemeView screen="auth_signup" props={props} />;
}
