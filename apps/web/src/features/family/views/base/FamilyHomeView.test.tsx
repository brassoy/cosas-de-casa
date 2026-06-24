/**
 * Tests de la vista presentacional `base` de family_home.
 *
 * Presentacional puro: props in / callbacks out. Cubre el grid de accesos
 * rápidos, las notificaciones (props puras), la invitación por PIN (solo OWNER)
 * y los estados de la lista de miembros.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import FamilyHomeView from './FamilyHomeView';
import type {
  FamilyHomeViewProps,
  FamilyQuickAccess,
} from '../types';

const QUICK_ACCESS: FamilyQuickAccess[] = [
  { id: 'lists', emoji: '🛒', label: 'Listas de la compra' },
  { id: 'tasks', emoji: '✅', label: 'Tareas' },
];

const makeMember = (overrides: Partial<FamilyMemberDto> = {}): FamilyMemberDto => ({
  userId: 'user-1',
  displayName: 'Ana García',
  role: 'MEMBER',
  joinedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

const makePin = (overrides: Partial<GeneratePinResponse> = {}): GeneratePinResponse => ({
  code: 'A1B2C3D4',
  expiresAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

function setup(overrides: Partial<FamilyHomeViewProps> = {}) {
  const props: FamilyHomeViewProps = {
    familyId: 'family-1',
    familyName: 'Casa García',
    isOwner: false,
    members: [],
    quickAccess: QUICK_ACCESS,
    notificationsEnabled: false,
    onToggleNotifications: vi.fn(),
    onGeneratePin: vi.fn(),
    onCopyPin: vi.fn(),
    onShare: vi.fn(),
    onOpen: vi.fn(),
    ...overrides,
  };
  render(<FamilyHomeView {...props} />);
  return props;
}

describe('FamilyHomeView (base) — cabecera y accesos', () => {
  it('muestra el nombre de la familia', () => {
    setup();
    expect(screen.getByRole('heading', { name: /casa garcía/i })).toBeInTheDocument();
  });

  it('renderiza un tile por cada acceso rápido', () => {
    setup();
    expect(screen.getByRole('button', { name: /listas de la compra/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tareas/i })).toBeInTheDocument();
  });

  it('dispara onOpen con el id del acceso al pulsar un tile', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /listas de la compra/i }));
    expect(props.onOpen).toHaveBeenCalledWith('lists');
  });
});

describe('FamilyHomeView (base) — notificaciones', () => {
  it('dispara onToggleNotifications al cambiar el switch', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('switch', { name: /activar notificaciones/i }));
    expect(props.onToggleNotifications).toHaveBeenCalled();
  });

  it('el switch refleja el estado activo', () => {
    setup({ notificationsEnabled: true });
    expect(screen.getByRole('switch', { name: /activar notificaciones/i })).toBeChecked();
  });

  it('deshabilita el switch cuando las notificaciones no están disponibles', () => {
    setup({ notificationsDisabled: true });
    expect(screen.getByRole('switch', { name: /activar notificaciones/i })).toBeDisabled();
  });
});

describe('FamilyHomeView (base) — invitación por PIN (OWNER)', () => {
  it('no muestra la sección de invitar si no es OWNER', () => {
    setup({ isOwner: false });
    expect(screen.queryByRole('heading', { name: /invitar miembros/i })).not.toBeInTheDocument();
  });

  it('muestra el botón de generar PIN si es OWNER y aún no hay PIN', () => {
    setup({ isOwner: true });
    expect(screen.getByRole('button', { name: /generar pin/i })).toBeInTheDocument();
  });

  it('dispara onGeneratePin al pulsar el botón', async () => {
    const user = userEvent.setup();
    const props = setup({ isOwner: true });
    await user.click(screen.getByRole('button', { name: /generar pin/i }));
    expect(props.onGeneratePin).toHaveBeenCalledOnce();
  });

  it('muestra el PIN generado con su caducidad y oculta el botón de generar', () => {
    setup({ isOwner: true, generatedPin: makePin({ code: 'A1B2C3D4' }) });
    expect(screen.getByText('A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText(/caduca:/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generar pin/i })).not.toBeInTheDocument();
  });

  it('dispara onCopyPin y onShare desde la caja del PIN', async () => {
    const user = userEvent.setup();
    const props = setup({ isOwner: true, generatedPin: makePin() });

    await user.click(screen.getByRole('button', { name: /copiar pin/i }));
    expect(props.onCopyPin).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(props.onShare).toHaveBeenCalledWith('whatsapp');

    await user.click(screen.getByRole('button', { name: /telegram/i }));
    expect(props.onShare).toHaveBeenCalledWith('telegram');
  });

  it('muestra el error de PIN que llega por props', () => {
    setup({ isOwner: true, pinError: 'No se ha podido generar el PIN.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido generar/i);
  });
});

describe('FamilyHomeView (base) — miembros', () => {
  it('muestra el estado de carga', () => {
    const { container } = render(
      <FamilyHomeView
        familyId="f1"
        familyName="Casa"
        isOwner={false}
        members={[]}
        quickAccess={QUICK_ACCESS}
        membersLoading
        notificationsEnabled={false}
        onToggleNotifications={vi.fn()}
        onGeneratePin={vi.fn()}
        onCopyPin={vi.fn()}
        onShare={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('muestra el error de miembros', () => {
    setup({ membersError: 'No se han podido cargar los miembros.' });
    expect(screen.getByText(/no se han podido cargar los miembros/i)).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay miembros', () => {
    setup({ members: [] });
    expect(screen.getByText(/aún no hay miembros/i)).toBeInTheDocument();
  });

  it('renderiza una fila por cada miembro con su rol', () => {
    setup({
      members: [
        makeMember({ userId: 'u1', displayName: 'Ana García', role: 'OWNER' }),
        makeMember({ userId: 'u2', displayName: 'Luis Pérez', role: 'MEMBER' }),
      ],
    });
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('Propietario')).toBeInTheDocument();
    expect(screen.getByText('Miembro')).toBeInTheDocument();
  });

  it('muestra el avatar como imagen cuando hay avatarUrl', () => {
    setup({
      members: [makeMember({ displayName: 'Ana', avatarUrl: 'https://example.com/a.png' })],
    });
    const img = screen.getByRole('img', { name: 'Ana' });
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
  });

  it('muestra la inicial cuando no hay avatarUrl', () => {
    setup({ members: [makeMember({ displayName: 'Ana García' })] });
    const list = screen.getByRole('list');
    expect(within(list).getByText('A')).toBeInTheDocument();
  });
});

// ── Gestionar familia: movida a su propia pantalla (family_manage) ────────────
// La sección de administración ya NO vive en la home; sus tests están en
// `FamilyManageView.test.tsx`. Aquí solo guardamos que la home no la renderiza.

describe('FamilyHomeView (base) — sin gestión de familia', () => {
  it('no renderiza la sección "Gestionar familia" en la home (movida a Ajustes)', () => {
    setup({
      isOwner: true,
      members: [makeMember({ userId: 'me', displayName: 'Yo Owner', role: 'OWNER' })],
    });
    expect(
      screen.queryByRole('heading', { name: /gestionar familia/i }),
    ).not.toBeInTheDocument();
  });
});
