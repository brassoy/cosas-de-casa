import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    onOpenSettings: vi.fn(),
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
        onOpenSettings={vi.fn()}
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
        onOpenSettings={vi.fn()}
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

  it('muestra el botón de Ajustes y dispara onOpenSettings (visible para todos)', async () => {
    const user = userEvent.setup();
    const props = setup({ isOwner: false });
    const settingsBtn = screen.getByRole('button', { name: /ajustes/i });
    expect(settingsBtn).toBeInTheDocument();
    await user.click(settingsBtn);
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
  });

  it('ya NO muestra las acciones de salir, editar ni borrar (movidas a Ajustes)', () => {
    setup({ isOwner: true });
    expect(screen.queryByRole('button', { name: /salir de la peña/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /editar peña/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /borrar peña/i })).not.toBeInTheDocument();
  });

  it('dispara onBack al pulsar volver', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /volver a mis peñas/i }));
    expect(props.onBack).toHaveBeenCalledOnce();
  });

  // ── Gestión de OWNER (miembros) ──────────────────────────────────────────────

  describe('gestión de OWNER', () => {
    function setupOwner(overrides: Partial<GroupHomeViewProps> = {}) {
      return setup({
        isOwner: true,
        currentUserId: OWNER_MEMBER.userId,
        onChangeMemberRole: vi.fn(),
        onExpelMember: vi.fn(),
        ...overrides,
      });
    }

    it('NO muestra controles de gestión a un miembro normal', () => {
      setup({ isOwner: false });
      expect(screen.queryByRole('button', { name: /expulsar/i })).not.toBeInTheDocument();
    });

    it('no permite gestionar al propio usuario (no hay botón expulsar en su fila)', () => {
      setupOwner();
      // Solo el OTRO miembro tiene botón de expulsar; el OWNER actual no.
      expect(screen.getAllByRole('button', { name: /expulsar/i })).toHaveLength(1);
    });

    it('cambia el rol de un miembro al rol opuesto', async () => {
      const user = userEvent.setup();
      const props = setupOwner();
      // REGULAR_MEMBER es MEMBER → la acción lo asciende a OWNER.
      await user.click(screen.getByRole('button', { name: /hacer propietario/i }));
      expect(props.onChangeMemberRole).toHaveBeenCalledWith(REGULAR_MEMBER.userId, 'OWNER');
    });

    it('expulsa a un miembro con su userId', async () => {
      const user = userEvent.setup();
      const props = setupOwner();
      await user.click(screen.getByRole('button', { name: /expulsar/i }));
      expect(props.onExpelMember).toHaveBeenCalledWith(REGULAR_MEMBER.userId);
    });
  });
});
