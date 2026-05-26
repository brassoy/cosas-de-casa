import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeSelector } from './ThemeSelector';
import { NavDrawer } from './NavDrawer';

export function AppHeader() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const clearFamily = useFamilyStore((s) => s.clearFamily);
  const navigate = useNavigate();

  async function handleLogout() {
    clearFamily();
    await signOut();
  }

  function goHome() {
    if (activeFamily) {
      void navigate({ to: '/family/$familyId', params: { familyId: activeFamily.id } });
    } else {
      void navigate({ to: '/' });
    }
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
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        {/* El drawer se renderiza a sí mismo solo si hay sesión + familia activa. */}
        <NavDrawer />

        <button
          type="button"
          onClick={goHome}
          aria-label="Ir al inicio"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          Cosas de Casa
        </button>
      </div>

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
