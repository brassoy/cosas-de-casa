import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// La barra usa los hooks de TanStack Router. En un test unitario sin
// RouterProvider los mockeamos para aislar el componente. `pathname` apunta a la
// ruta de listas para comprobar el resaltado de la entrada activa.
const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouterState: (opts: { select: (s: { location: { pathname: string } }) => unknown }) =>
    opts.select({ location: { pathname: '/family/fam-1/lists' } }),
}));

import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renderiza los 4 accesos rápidos', () => {
    render(<BottomNav familyId="fam-1" />);
    for (const label of ['Compra', 'Tareas', 'Planes', 'Calendario']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('marca como activa la sección de la ruta actual', () => {
    render(<BottomNav familyId="fam-1" />);
    expect(screen.getByRole('button', { name: 'Compra' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Tareas' })).not.toHaveAttribute('aria-current');
  });
});
