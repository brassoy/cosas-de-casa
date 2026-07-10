/**
 * Tests de la vista presentacional `base` de family_manage ("Gestionar familia").
 *
 * La pantalla es accesible a TODO miembro. Presentacional pura: props in /
 * callbacks out. Cubre:
 *  - Secciones de miembro (todos): lista de miembros (solo lectura) y "Salir
 *    de la familia".
 *  - Secciones de OWNER (solo si llegan `invite`/`manage`): invitación por PIN,
 *    controles de rol/expulsión, nombre/descripción y borrado.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import FamilyManageView from './FamilyManageView';
import type {
  FamilyInviteProps,
  FamilyManageProps,
  FamilyManageViewProps,
} from '../types';

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

const makeInvite = (overrides: Partial<FamilyInviteProps> = {}): FamilyInviteProps => ({
  onGeneratePin: vi.fn(),
  onCopyPin: vi.fn(),
  onShare: vi.fn(),
  ...overrides,
});

const makePin = (overrides: Partial<GeneratePinResponse> = {}): GeneratePinResponse => ({
  code: 'A1B2C3D4',
  expiresAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

const MANAGE_MEMBERS: FamilyMemberDto[] = [
  { userId: 'me', displayName: 'Yo Owner', role: 'OWNER', joinedAt: '2024-01-01T00:00:00.000Z' },
  { userId: 'u2', displayName: 'Luis Pérez', role: 'MEMBER', joinedAt: '2024-02-01T00:00:00.000Z' },
];

function setup(overrides: Partial<FamilyManageViewProps> = {}) {
  const props: FamilyManageViewProps = {
    members: MANAGE_MEMBERS,
    onLeaveFamily: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<FamilyManageView {...props} />);
  return props;
}

describe('FamilyManageView (base) — cabecera', () => {
  it('muestra la pantalla "Gestionar familia"', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: /gestionar familia/i }),
    ).toBeInTheDocument();
  });

  it('dispara onBack desde el botón de volver', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /volver a la familia/i }));
    expect(props.onBack).toHaveBeenCalledOnce();
  });
});

describe('FamilyManageView (base) — secciones de miembro (todos)', () => {
  it('muestra la lista de miembros en solo lectura sin manage (no OWNER)', () => {
    setup();
    expect(screen.getByText('Yo Owner')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('Propietario')).toBeInTheDocument();
    // Sin manage no hay controles de administración.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expulsar/i })).not.toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay miembros', () => {
    setup({ members: [] });
    expect(screen.getByText(/aún no hay miembros/i)).toBeInTheDocument();
  });

  it('dispara onLeaveFamily al pulsar "Salir de la familia"', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /salir de la familia/i }));
    expect(props.onLeaveFamily).toHaveBeenCalledOnce();
  });

  it('muestra el error de salida que llega por props', () => {
    setup({ leaveError: 'No se ha podido salir de la familia. Inténtalo de nuevo.' });
    expect(screen.getByText(/no se ha podido salir/i)).toBeInTheDocument();
  });

  it('no muestra invitación ni administración si no llegan invite/manage', () => {
    setup();
    expect(screen.queryByRole('heading', { name: /invitar miembros/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/zona peligrosa/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
  });
});

describe('FamilyManageView (base) — invitación por PIN (OWNER)', () => {
  it('muestra el botón de generar PIN cuando llega invite sin PIN', () => {
    setup({ invite: makeInvite() });
    expect(screen.getByRole('button', { name: /generar pin/i })).toBeInTheDocument();
  });

  it('dispara onGeneratePin al pulsar el botón', async () => {
    const user = userEvent.setup();
    const invite = makeInvite();
    setup({ invite });
    await user.click(screen.getByRole('button', { name: /generar pin/i }));
    expect(invite.onGeneratePin).toHaveBeenCalledOnce();
  });

  it('muestra el PIN generado con su caducidad y permite copiar/compartir/revocar', async () => {
    const user = userEvent.setup();
    const invite = makeInvite({
      generatedPin: makePin({ code: 'A1B2C3D4' }),
      onRevokePin: vi.fn(),
    });
    setup({ invite });

    expect(screen.getByText('A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText(/caduca:/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generar pin/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copiar pin/i }));
    expect(invite.onCopyPin).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(invite.onShare).toHaveBeenCalledWith('whatsapp');

    await user.click(screen.getByRole('button', { name: /revocar pin/i }));
    expect(invite.onRevokePin).toHaveBeenCalledOnce();
  });

  it('muestra el error de PIN que llega por props', () => {
    setup({ invite: makeInvite({ pinError: 'No se ha podido generar el PIN.' }) });
    expect(screen.getByText(/no se ha podido generar/i)).toBeInTheDocument();
  });
});

describe('FamilyManageView (base) — administración (OWNER)', () => {
  it('ofrece controles de rol/expulsión para los demás miembros, no para uno mismo', () => {
    setup({ manage: makeManage({ currentUserId: 'me' }) });
    // Luis tiene select y expulsar; el propio usuario ve su rol en solo lectura.
    expect(screen.getByRole('combobox', { name: /rol de luis pérez/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /expulsar a luis pérez/i })).toBeEnabled();
    expect(screen.queryByRole('combobox', { name: /rol de yo owner/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /expulsar a yo owner/i }),
    ).not.toBeInTheDocument();
  });

  it('dispara onChangeRole al cambiar el rol de otro miembro', async () => {
    const user = userEvent.setup();
    const manage = makeManage();
    setup({ manage });
    await user.selectOptions(
      screen.getByRole('combobox', { name: /rol de luis pérez/i }),
      'OWNER',
    );
    expect(manage.onChangeRole).toHaveBeenCalledWith('u2', 'OWNER');
  });

  it('dispara onRemoveMember al expulsar a otro miembro', async () => {
    const user = userEvent.setup();
    const manage = makeManage();
    setup({ manage });
    await user.click(screen.getByRole('button', { name: /expulsar a luis pérez/i }));
    expect(manage.onRemoveMember).toHaveBeenCalledWith('u2');
  });

  it('precarga el formulario con nombre y descripción y permite guardar cambios', async () => {
    const user = userEvent.setup();
    const manage = makeManage({ initialName: 'Casa García', initialDescription: 'Hogar' });
    setup({ manage });

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
    const manage = makeManage();
    setup({ manage });
    await user.click(screen.getByRole('button', { name: /borrar la familia/i }));
    expect(manage.onDeleteFamily).toHaveBeenCalledOnce();
  });

  it('muestra el error de gestión de miembros que llega por props', () => {
    setup({ manage: makeManage({ memberError: 'Debe quedar al menos un propietario.' }) });
    expect(screen.getByText(/al menos un propietario/i)).toBeInTheDocument();
  });
});
