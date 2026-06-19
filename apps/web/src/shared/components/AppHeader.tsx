import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeSelector } from './ThemeSelector';
import { NavDrawer } from './NavDrawer';
import { APP_MAX_WIDTH } from '@/shared/layout';

export function AppHeader() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const clearFamily = useFamilyStore((s) => s.clearFamily);
  const navigate = useNavigate();

  async function handleLogout() {
    clearFamily();
    await signOut();
    // Los guards de ruta (beforeLoad) solo corren al navegar, no reaccionan al
    // cambio de sesión en la misma página. Sin esto, tras cerrar sesión te
    // quedabas en la ruta protegida ("No hay ninguna familia activa").
    void navigate({ to: '/login' });
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
        // Barra full-width (de borde a borde) con fondo blanco.
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Contenido centrado a APP_MAX_WIDTH: la barra es full-width pero la marca
          y las acciones no se pegan a los extremos en pantallas anchas. */}
      <div
        style={{
          maxWidth: APP_MAX_WIDTH,
          marginInline: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
          // Padding lateral contenido para que en móvil (≈360-390px) entren marca
          // + acciones sin que el texto salte de línea.
          padding: 'var(--space-3) var(--space-4)',
        }}
      >
        {/* minWidth:0 permite que este grupo (la marca) se encoja y la marca se
            recorte con elipsis antes de forzar un salto de línea o un overflow. */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', minWidth: 0 }}>
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
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-heading)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          Cosas de Casa
        </button>
      </div>

      {/* flexShrink:0 → las acciones nunca se encogen ni saltan de línea. */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
        <ThemeSelector />

        {session && (
          <button
            type="button"
            onClick={() => void handleLogout()}
            style={btnStyle}
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        )}
        </div>
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
  whiteSpace: 'nowrap',
};
