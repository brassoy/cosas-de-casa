import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GroupHomeView from './GroupHomeView';
import type { GroupHomeViewProps } from '../types';
import type { GroupMemberDto } from '../../contracts';

const OWNER_MEMBER: GroupMemberDto = {
  userId: 'user-owner',
  displayName: 'Propietario Test',
  role: 'OWNER',
  joinedAt: '2026-05-01T00:00:00Z',
};

const REGULAR_MEMBER: GroupMemberDto = {
  userId: 'user-other',
  displayName: 'Otro Usuario',
  role: 'MEMBER',
  joinedAt: '2026-05-02T00:00:00Z',
};

function setup(overrides: Partial<GroupHomeViewProps> = {}) {
  const props: GroupHomeViewProps = {
    groupName: 'Cuadrilla del pueblo',
    isOwner: false,
    members: [OWNER_MEMBER, REGULAR_MEMBER],
    onBack: vi.fn(),
    onGeneratePin: vi.fn(),
    onLeave: vi.fn(),
    ...overrides,
  };
  render(<GroupHomeView {...props} />);
  return props;
}

describe('GroupHomeView (base)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el nombre de la peña y los miembros', () => {
    setup();
    expect(screen.getByRole('heading', { name: /cuadrilla del pueblo/i })).toBeInTheDocument();
    expect(screen.getByText('Propietario Test')).toBeInTheDocument();
    expect(screen.getByText('Otro Usuario')).toBeInTheDocument();
  });

  it('muestra el botón de generar PIN solo para el OWNER', () => {
    const { rerender } = render(
      <GroupHomeView
        groupName="X"
        isOwner={false}
        members={[OWNER_MEMBER]}
        onBack={vi.fn()}
        onGeneratePin={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /generar pin/i })).not.toBeInTheDocument();

    rerender(
      <GroupHomeView
        groupName="X"
        isOwner
        members={[OWNER_MEMBER]}
        onBack={vi.fn()}
        onGeneratePin={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /generar pin/i })).toBeInTheDocument();
  });

  it('dispara onGeneratePin al pulsar "Generar PIN"', async () => {
    const user = userEvent.setup();
    const props = setup({ isOwner: true });
    await user.click(screen.getByRole('button', { name: /generar pin/i }));
    expect(props.onGeneratePin).toHaveBeenCalledOnce();
  });

  it('muestra el PIN generado con opciones de compartir', () => {
    setup({ isOwner: true, generatedPin: 'XY12AB34' });
    expect(screen.getByText('XY12AB34')).toBeInTheDocument();
    expect(screen.getByText(/compartir por whatsapp/i)).toBeInTheDocument();
    expect(screen.getByText(/compartir por telegram/i)).toBeInTheDocument();
  });

  it('muestra el error de generación de PIN que llega por props', () => {
    setup({ isOwner: true, pinError: 'Error del servidor' });
    expect(screen.getByRole('alert')).toHaveTextContent(/error del servidor/i);
  });

  it('muestra el botón de salir de la peña', () => {
    setup();
    expect(screen.getByRole('button', { name: /salir de la peña/i })).toBeInTheDocument();
  });

  it('pide confirmación en 2 toques y solo entonces llama a onLeave', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: /salir de la peña/i }));

    // Primer toque: arma la confirmación, NO llama a onLeave.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
    expect(props.onLeave).not.toHaveBeenCalled();

    // Segundo toque: confirma y llama a onLeave.
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(props.onLeave).toHaveBeenCalledOnce();
  });

  it('cancela la confirmación sin llamar a onLeave', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: /salir de la peña/i }));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onLeave).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it('dispara onBack al pulsar volver', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /volver a mis peñas/i }));
    expect(props.onBack).toHaveBeenCalledOnce();
  });
});
