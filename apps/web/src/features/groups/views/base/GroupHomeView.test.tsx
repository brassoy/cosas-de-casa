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

  // ── Gestión de OWNER ─────────────────────────────────────────────────────────

  describe('gestión de OWNER', () => {
    function setupOwner(overrides: Partial<GroupHomeViewProps> = {}) {
      return setup({
        isOwner: true,
        currentUserId: OWNER_MEMBER.userId,
        onChangeMemberRole: vi.fn(),
        onExpelMember: vi.fn(),
        onUpdateGroup: vi.fn(),
        onDeleteGroup: vi.fn(),
        ...overrides,
      });
    }

    it('NO muestra controles de gestión a un miembro normal', () => {
      setup({ isOwner: false });
      expect(screen.queryByRole('button', { name: /expulsar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /editar peña/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /borrar peña/i })).not.toBeInTheDocument();
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

    it('guarda nombre y descripción al editar la peña', async () => {
      const user = userEvent.setup();
      const props = setupOwner();
      const nameInput = screen.getByRole('textbox', { name: /nombre de la peña/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Cuadrilla renombrada');
      await user.type(
        screen.getByRole('textbox', { name: /descripción de la peña/i }),
        'Nueva descripción',
      );
      await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
      expect(props.onUpdateGroup).toHaveBeenCalledWith({
        name: 'Cuadrilla renombrada',
        description: 'Nueva descripción',
      });
    });

    it('muestra el error de edición que llega por props', () => {
      setupOwner({ updateError: 'Nombre inválido' });
      expect(screen.getByText(/nombre inválido/i)).toBeInTheDocument();
    });

    it('pide confirmación en 2 toques antes de borrar la peña', async () => {
      const user = userEvent.setup();
      const props = setupOwner();

      await user.click(screen.getByRole('button', { name: /^borrar peña$/i }));
      // Primer toque: arma la confirmación, NO borra.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sí, borrar peña/i })).toBeInTheDocument();
      });
      expect(props.onDeleteGroup).not.toHaveBeenCalled();

      // Segundo toque: confirma y borra.
      await user.click(screen.getByRole('button', { name: /sí, borrar peña/i }));
      expect(props.onDeleteGroup).toHaveBeenCalledOnce();
    });

    it('muestra el error de borrado que llega por props', () => {
      setupOwner({ deleteError: 'No se ha podido borrar' });
      expect(screen.getByText(/no se ha podido borrar/i)).toBeInTheDocument();
    });
  });
});
