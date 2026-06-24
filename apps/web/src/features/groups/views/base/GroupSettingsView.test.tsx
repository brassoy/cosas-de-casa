import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GroupSettingsView from './GroupSettingsView';
import type { GroupSettingsViewProps } from '../types';

function setup(overrides: Partial<GroupSettingsViewProps> = {}) {
  const props: GroupSettingsViewProps = {
    groupName: 'Cuadrilla del pueblo',
    isOwner: false,
    onLeave: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<GroupSettingsView {...props} />);
  return props;
}

/** Helper para montar la vista con el OWNER cableado (editar + borrar). */
function setupOwner(overrides: Partial<GroupSettingsViewProps> = {}) {
  return setup({
    isOwner: true,
    onUpdateGroup: vi.fn(),
    onDeleteGroup: vi.fn(),
    ...overrides,
  });
}

describe('GroupSettingsView (base)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el título de ajustes y el nombre de la peña', () => {
    setup();
    expect(screen.getByRole('heading', { name: /ajustes de la peña/i })).toBeInTheDocument();
    expect(screen.getByText('Cuadrilla del pueblo')).toBeInTheDocument();
  });

  it('dispara onBack al pulsar volver', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /volver a la peña/i }));
    expect(props.onBack).toHaveBeenCalledOnce();
  });

  // ── Salir (cualquier miembro) ────────────────────────────────────────────────

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

  it('muestra el error de salida que llega por props', () => {
    setup({ leaveError: 'No se ha podido salir' });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido salir/i);
  });

  // ── Gestión de OWNER (editar / borrar) ───────────────────────────────────────

  it('NO muestra editar ni borrar a un miembro normal', () => {
    setup({ isOwner: false });
    expect(screen.queryByRole('heading', { name: /editar peña/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /borrar peña/i })).not.toBeInTheDocument();
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
