import { type FormEvent, useState } from 'react';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleClick: () => void;
  loading?: boolean;
}

/** Formulario reutilizable para LoginPage y SignupPage. */
export function AuthForm({ mode, onSubmit, onGoogleClick, loading = false }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';
  const title = isLogin ? 'Inicia sesión' : 'Regístrate';
  const submitLabel = isLogin ? 'Entrar' : 'Crear cuenta';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ha ocurrido un error. Inténtalo de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || loading;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.heading}>{title}</h2>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          <label htmlFor="email" style={styles.label}>
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            style={styles.input}
            disabled={busy}
          />

          <label htmlFor="password" style={styles.label}>
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={styles.input}
            disabled={busy}
          />

          <button type="submit" style={styles.btnPrimary} disabled={busy}>
            {busy ? 'Cargando...' : submitLabel}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>o</span>
        </div>

        <button
          type="button"
          onClick={onGoogleClick}
          style={styles.btnGoogle}
          disabled={busy}
        >
          Continuar con Google
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface)',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-8)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--color-border)',
  },
  heading: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-6)',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-muted)',
  },
  input: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    width: '100%',
  },
  btnPrimary: {
    marginTop: 'var(--space-2)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    marginBottom: 'var(--space-4)',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: 'var(--space-4) 0',
    borderTop: '1px solid var(--color-border)',
  },
  dividerText: {
    position: 'relative',
    top: '-0.75em',
    backgroundColor: 'var(--color-surface-raised)',
    padding: '0 var(--space-2)',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  btnGoogle: {
    width: '100%',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
};
