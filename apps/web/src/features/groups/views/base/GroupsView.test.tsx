import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GroupsView from './GroupsView';
import type { GroupsViewProps } from '../types';
import type { GroupSummaryDto } from '../../contracts';

const MOCK_GROUPS: GroupSummaryDto[] = [
  {
    id: 'group-1',
    name: 'Peña Los Compadres',
    description: 'Los mejores',
    role: 'OWNER',
    updatedAt: '2026-05-01T00:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Cine del Jueves',
    role: 'MEMBER',
    updatedAt: '2026-05-02T00:00:00Z',
    createdAt: '2026-05-02T00:00:00Z',
  },
];

function setup(overrides: Partial<GroupsViewProps> = {}) {
  const props: GroupsViewProps = {
    groups: [],
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onJoin: vi.fn(),
    ...overrides,
  };
  render(<GroupsView {...props} />);
  return props;
}

describe('GroupsView (base)', () => {
  it('muestra el encabezado y los botones de acción', () => {
    setup();
    expect(screen.getByRole('heading', { name: /mis peñas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva peña/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unirse con pin/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay peñas', () => {
    setup({ groups: [] });
    expect(screen.getByText(/aún no perteneces a ninguna peña/i)).toBeInTheDocument();
  });

  it('lista las peñas del usuario', () => {
    setup({ groups: MOCK_GROUPS });
    expect(screen.getByText('Peña Los Compadres')).toBeInTheDocument();
    expect(screen.getByText('Cine del Jueves')).toBeInTheDocument();
  });

  it('muestra el rol de cada peña', () => {
    setup({ groups: MOCK_GROUPS });
    expect(screen.getByText('Propietario')).toBeInTheDocument();
    expect(screen.getByText('Miembro')).toBeInTheDocument();
  });

  it('muestra error cuando se pasa un mensaje de error', () => {
    setup({ error: 'No se han podido cargar las peñas. Inténtalo de nuevo.' });
    expect(screen.getByText(/no se han podido cargar/i)).toBeInTheDocument();
  });

  it('no muestra el estado vacío mientras carga', () => {
    setup({ isLoading: true });
    expect(screen.queryByText(/aún no perteneces a ninguna peña/i)).not.toBeInTheDocument();
  });

  it('dispara onCreate al pulsar "Nueva peña"', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /nueva peña/i }));
    expect(props.onCreate).toHaveBeenCalledOnce();
  });

  it('dispara onJoin al pulsar "Unirse con PIN"', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /unirse con pin/i }));
    expect(props.onJoin).toHaveBeenCalledOnce();
  });

  it('dispara onSelect con la peña al pulsar su tarjeta', async () => {
    const user = userEvent.setup();
    const props = setup({ groups: MOCK_GROUPS });
    await user.click(screen.getByRole('button', { name: /abrir peña peña los compadres/i }));
    expect(props.onSelect).toHaveBeenCalledWith(MOCK_GROUPS[0]);
  });
});
