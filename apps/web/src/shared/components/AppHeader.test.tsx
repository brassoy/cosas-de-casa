import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

// AppHeader monta NavDrawer, que usa los hooks de TanStack Router. En un test
// unitario sin RouterProvider los mockeamos para aislar la cabecera.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouterState: (opts: { select: (s: { location: { pathname: string } }) => unknown }) =>
    opts.select({ location: { pathname: '/' } }),
}));

// El header consulta el avatar del usuario vía useProfile (useQuery); lo
// mockeamos para no necesitar QueryClientProvider en este test unitario.
vi.mock('@/features/settings/hooks/useProfile', () => ({
  useProfile: () => ({ data: undefined }),
}));

import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('renders the app name as a home link', () => {
    render(<AppHeader />);
    expect(screen.getByRole('button', { name: /ir al inicio/i })).toHaveTextContent(
      /cosas de casa/i,
    );
  });

  it('renders the theme toggle button', () => {
    render(<AppHeader />);
    expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument();
  });
});
