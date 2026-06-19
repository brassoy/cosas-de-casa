import { Outlet } from '@tanstack/react-router';
import { AppHeader } from './shared/components/AppHeader';
import { BottomNav } from './shared/components/BottomNav';
import { useAuthStore } from './features/auth/store/auth.store';
import { useFamilyStore } from './features/family/store/family.store';
import { useIsMobile } from './shared/hooks/use-mobile';

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
    // app-shell = lienzo de la página (fondo neutro). En desktop se ve alrededor
    // de la columna; en móvil queda tapado por ella (la columna es full-width).
    <div className="app-shell" style={shellStyle}>
      {/* app-frame = la "columna app": ancho máximo, centrada, con el fondo del
          theme. Así en web no se estira a todo el ancho y las cards respiran. */}
      <div className="app-frame" style={frameStyle}>
        <AppHeader />
        <main
          className="app-main"
          style={
            showBottomNav ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' } : undefined
          }
        >
          <Outlet />
        </main>
      </div>
      {showBottomNav && activeFamily && <BottomNav familyId={activeFamily.id} />}
    </div>
  );
}

const APP_MAX_WIDTH = '42rem'; // 672px — coincide con el max-w-2xl de las vistas

const shellStyle: React.CSSProperties = {
  minHeight: '100dvh',
  // Fondo neutro de la página (gris muy claro) para que la columna app destaque.
  backgroundColor: '#edeef0',
};

const frameStyle: React.CSSProperties = {
  maxWidth: APP_MAX_WIDTH,
  marginInline: 'auto',
  minHeight: '100dvh',
  // Fondo del theme activo (da el contraste a las cards, que usan surface-raised).
  backgroundColor: 'var(--color-surface)',
  // Eleva ligeramente la columna sobre el lienzo en desktop.
  boxShadow: '0 0 40px rgba(0, 0, 0, 0.06)',
};
