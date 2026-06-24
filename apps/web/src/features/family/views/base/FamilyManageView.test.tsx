/**
 * Tests de la vista presentacional `base` de family_manage ("Gestionar familia").
 *
 * Esta sección de administración se extrajo de la home a su propia pantalla.
 * Presentacional pura: props in / callbacks out. Cubre gestión de miembros
 * (rol/expulsar), edición de nombre/descripción y borrado de la familia.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import FamilyManageView from './FamilyManageView';
import type { FamilyManageProps } from '../types';

const makeManage = (overrides: Partial<FamilyManageProps> = {}): FamilyManageProps => ({
  onChangeRole: vi.fn(),
  onRemoveMember: vi.fn(),
  currentUserId: 'me',
  initialName: 'Casa García',
  initialDescription: 'Nuestro hogar',
  onSaveDetails: vi.fn(),
  onDeleteFamily: vi.fn(),
  ...overrides,
});

const MANAGE_MEMBERS: FamilyMemberDto[] = [
  { userId: 'me', displayName: 'Yo Owner', role: 'OWNER', joinedAt: '2024-01-01T00:00:00.000Z' },
  { userId: 'u2', displayName: 'Luis Pérez', role: 'MEMBER', joinedAt: '2024-02-01T00:00:00.000Z' },
];

function setup(manageOverrides: Partial<FamilyManageProps> = {}) {
  const manage = makeManage(manageOverrides);
  const onBack = vi.fn();
  render(<FamilyManageView manage={manage} members={MANAGE_MEMBERS} onBack={onBack} />);
  return { manage, onBack };
}

describe('FamilyManageView (base)', () => {
  it('muestra la sección "Gestionar familia"', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: /gestionar familia/i }),
    ).toBeInTheDocument();
  });

  it('dispara onBack desde el botón de volver', async () => {
    const user = userEvent.setup();
    const { onBack } = setup();
    await user.click(screen.getByRole('button', { name: /volver a la familia/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('deshabilita los controles del propio usuario (no puede gestionarse a sí mismo)', () => {
    setup({ currentUserId: 'me' });
    expect(screen.getByRole('combobox', { name: /rol de yo owner/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /expulsar a yo owner/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /rol de luis pérez/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /expulsar a luis pérez/i })).toBeEnabled();
  });

  it('dispara onChangeRole al cambiar el rol de otro miembro', async () => {
    const user = userEvent.setup();
    const { manage } = setup();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /rol de luis pérez/i }),
      'OWNER',
    );
    expect(manage.onChangeRole).toHaveBeenCalledWith('u2', 'OWNER');
  });

  it('dispara onRemoveMember al expulsar a otro miembro', async () => {
    const user = userEvent.setup();
    const { manage } = setup();
    await user.click(screen.getByRole('button', { name: /expulsar a luis pérez/i }));
    expect(manage.onRemoveMember).toHaveBeenCalledWith('u2');
  });

  it('precarga el formulario con nombre y descripción y permite guardar cambios', async () => {
    const user = userEvent.setup();
    const { manage } = setup({ initialName: 'Casa García', initialDescription: 'Hogar' });

    const nameInput = screen.getByLabelText('Nombre');
    expect(nameInput).toHaveValue('Casa García');

    // Sin cambios → el botón de guardar está deshabilitado.
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, 'Casa Pérez');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(manage.onSaveDetails).toHaveBeenCalledWith({ name: 'Casa Pérez' });
  });

  it('dispara onDeleteFamily desde la zona peligrosa', async () => {
    const user = userEvent.setup();
    const { manage } = setup();
    await user.click(screen.getByRole('button', { name: /borrar la familia/i }));
    expect(manage.onDeleteFamily).toHaveBeenCalledOnce();
  });

  it('muestra el error de gestión de miembros que llega por props', () => {
    setup({ memberError: 'Debe quedar al menos un propietario.' });
    expect(screen.getByText(/al menos un propietario/i)).toBeInTheDocument();
  });
});
