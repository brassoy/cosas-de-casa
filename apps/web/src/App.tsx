import { Outlet } from '@tanstack/react-router';
import { AppHeader } from './shared/components/AppHeader';
import { BottomNav } from './shared/components/BottomNav';
import { useAuthStore } from './features/auth/store/auth.store';
import { useFamilyStore } from './features/family/store/family.store';
import { useIsMobile } from './shared/hooks/use-mobile';
import { APP_MAX_WIDTH } from './shared/layout';

export function App() {
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const isMobile = useIsMobile();

  // La barra inferior solo tiene sentido en móvil y cuando hay secciones del
  // hogar que mostrar (sesión + familia activa, igual que el drawer).
  const showBottomNav = isMobile && !!session && !!activeFamily;

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-base)',
        }}
        aria-busy="true"
        aria-label="Cargando..."
      >
        Cargando...
      </div>
    );
  }

  return (
    // Fondo blanco a pantalla completa. La cabecera y la barra inferior ocupan
    // TODO el ancho (full), pero su contenido se centra a APP_MAX_WIDTH. El
    // contenido principal también se centra: responsive, con tope para no
    // estirarse de forma desagradable en pantallas anchas.
    <div className="app-shell" style={shellStyle}>
      <AppHeader />
      <main
        className="app-main"
        style={
          showBottomNav ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' } : undefined
        }
      >
        <div className="app-content" style={contentStyle}>
          <Outlet />
        </div>
      </main>
      {showBottomNav && activeFamily && <BottomNav familyId={activeFamily.id} />}
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  minHeight: '100dvh',
  backgroundColor: '#ffffff',
};

const contentStyle: React.CSSProperties = {
  maxWidth: APP_MAX_WIDTH,
  marginInline: 'auto',
  width: '100%',
};
