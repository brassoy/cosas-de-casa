import { useNavigate } from '@tanstack/react-router';
import { AuthForm } from '../components/AuthForm';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(email: string, password: string) {
    await signIn(email, password);
    // La redirección real la gestiona el router guard; esto es un fallback
    await navigate({ to: '/' });
  }

  return (
    <>
      <AuthForm mode="login" onSubmit={handleSubmit} onGoogleClick={signInWithGoogle} />
      <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
        ¿No tienes cuenta?{' '}
        <a href="/signup" style={{ color: 'var(--color-accent)' }}>
          Regístrate
        </a>
      </p>
    </>
  );
}
