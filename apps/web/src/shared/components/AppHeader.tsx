import { toggleTheme } from '../theme/theme-bootstrap';

export function AppHeader() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)',
        }}
      >
        Cosas de Casa
      </h1>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        style={{
          background: 'none',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Tema
      </button>
    </header>
  );
}
