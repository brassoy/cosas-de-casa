import { useNavigate } from '@tanstack/react-router';

export function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.heading}>¡Bienvenido a Cosas de Casa!</h2>
        <p style={styles.subtitle}>
          Para empezar, crea tu unidad familiar o únete a una existente con un PIN de invitación.
        </p>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.btnPrimary}
            onClick={() => void navigate({ to: '/family/create' })}
          >
            Crea tu unidad familiar
          </button>
          <button
            type="button"
            style={styles.btnSecondary}
            onClick={() => void navigate({ to: '/family/join' })}
          >
            Únete con un PIN
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80dvh',
    padding: 'var(--space-4)',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-8)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  heading: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-3)',
  },
  subtitle: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-8)',
    lineHeight: 'var(--line-height-relaxed)',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  btnPrimary: {
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
  },
};
