import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeSelector } from './ThemeSelector';

export function AppHeader() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const clearFamily = useFamilyStore((s) => s.clearFamily);

  async function handleLogout() {
    clearFamily();
    await signOut();
  }

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
          fontFamily: 'var(--font-heading)',
        }}
      >
        Cosas de Casa
      </h1>

      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <ThemeSelector />

        {session && (
          <button
            type="button"
            onClick={() => void handleLogout()}
            style={btnStyle}
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-2) var(--space-3)',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-body)',
};
