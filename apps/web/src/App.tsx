import { Outlet } from '@tanstack/react-router';
import { AppHeader } from './shared/components/AppHeader';

export function App() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
