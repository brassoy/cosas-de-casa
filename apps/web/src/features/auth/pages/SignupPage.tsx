import { useNavigate } from '@tanstack/react-router';
import { AuthForm } from '../components/AuthForm';
import { useAuthStore } from '../store/auth.store';

export function SignupPage() {
  const { signUp, signInWithGoogle } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(email: string, password: string) {
    await signUp(email, password);
    // Supabase requiere confirmar el email por defecto; redirigimos al login con aviso
    await navigate({ to: '/login' });
  }

  return (
    <>
      <AuthForm mode="signup" onSubmit={handleSubmit} onGoogleClick={signInWithGoogle} />
      <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
        ¿Ya tienes cuenta?{' '}
        <a href="/login" style={{ color: 'var(--color-accent)' }}>
          Inicia sesión
        </a>
      </p>
    </>
  );
}
