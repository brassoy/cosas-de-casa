import { Outlet } from '@tanstack/react-router';
import { AppHeader } from './shared/components/AppHeader';
import { useAuthStore } from './features/auth/store/auth.store';

export function App() {
  const loading = useAuthStore((s) => s.loading);

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
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
