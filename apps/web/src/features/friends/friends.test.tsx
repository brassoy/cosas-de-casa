/**
 * Tests de la feature friends (vistas presentacionales `base`).
 *
 * Tras la migración a themes, el render vive en las vistas presentacionales
 * `views/base/FriendsView` y `views/base/FriendRedeemView` (props in / callbacks
 * out). Los containers (`FriendsPage` / `RedeemFriendPage`) solo cablean la
 * lógica real (familyId del store, mutaciones, clipboard, navegación) y delegan
 * en `ThemeView`, cuyo registry se compone en otra fase. Por eso los tests de UI
 * apuntan directamente a las vistas.
 *
 * Cubre:
 *  - FriendsView: encabezado, generar invitación, código + compartir, lista,
 *    estado vacío, error de carga, confirmación al quitar, navegar a canjear.
 *  - FriendRedeemView: formulario, callbacks de cambio/envío.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FriendFamilyDto } from './contracts';
import type { FriendsViewProps, FriendRedeemViewProps } from './views/types';
import FriendsView from './views/base/FriendsView';
import FriendRedeemView from './views/base/FriendRedeemView';

// ── Datos de prueba ───────────────────────────────────────────────────────────

const MOCK_FRIENDS: FriendFamilyDto[] = [
  {
    linkId: 'link-1',
    familyId: 'fam-2',
    familyName: 'Familia García',
    since: '2026-01-15T00:00:00Z',
  },
  {
    linkId: 'link-2',
    familyId: 'fam-3',
    familyName: 'Familia Martínez',
    familyImageUrl: 'https://example.com/img.jpg',
    since: '2026-02-20T00:00:00Z',
  },
];

// ── Helpers de render ─────────────────────────────────────────────────────────

function renderFriends(overrides: Partial<FriendsViewProps> = {}) {
  const props: FriendsViewProps = {
    friends: [],
    isLoading: false,
    error: false,
    generatedCode: null,
    isGenerating: false,
    inviteError: null,
    removeError: null,
    removingLinkId: null,
    onGenerateInvite: vi.fn(),
    onCopy: vi.fn(),
    onRemove: vi.fn(),
    onGoRedeem: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<FriendsView {...props} />) };
}

function renderRedeem(overrides: Partial<FriendRedeemViewProps> = {}) {
  const props: FriendRedeemViewProps = {
    code: '',
    familyName: 'Familia Pérez',
    error: null,
    isSubmitting: false,
    onCodeChange: vi.fn(),
    onSubmit: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<FriendRedeemView {...props} />) };
}

// ── Tests: FriendsView ──────────────────────────────────────────────────────

describe('FriendsView', () => {
  it('muestra el encabezado', () => {
    renderFriends();
    // h2 explícito para no colisionar con el h3 "Tus familias amigas"
    expect(
      screen.getByRole('heading', { name: /familias amigas/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it('muestra el botón de generar código de invitación', () => {
    renderFriends();
    expect(
      screen.getByRole('button', { name: /generar código de invitación/i }),
    ).toBeInTheDocument();
  });

  it('invoca onGenerateInvite al pulsar el botón', async () => {
    const user = userEvent.setup();
    const { props } = renderFriends();
    await user.click(screen.getByRole('button', { name: /generar código de invitación/i }));
    expect(props.onGenerateInvite).toHaveBeenCalledOnce();
  });

  it('muestra el estado vacío cuando no hay familias amigas', () => {
    renderFriends({ friends: [] });
    expect(screen.getByText(/aún no tienes familias amigas/i)).toBeInTheDocument();
  });

  it('lista las familias amigas', () => {
    renderFriends({ friends: MOCK_FRIENDS });
    expect(screen.getByText('Familia García')).toBeInTheDocument();
    expect(screen.getByText('Familia Martínez')).toBeInTheDocument();
  });

  it('muestra el código de invitación con opciones de compartir', () => {
    renderFriends({ generatedCode: 'INVITEX1' });
    expect(screen.getByText('INVITEX1')).toBeInTheDocument();
    expect(screen.getByText(/compartir por whatsapp/i)).toBeInTheDocument();
    expect(screen.getByText(/compartir por telegram/i)).toBeInTheDocument();
  });

  it('invoca onCopy con el código al pulsar Copiar', async () => {
    const user = userEvent.setup();
    const { props } = renderFriends({ generatedCode: 'INVITEX1' });
    await user.click(screen.getByRole('button', { name: /copiar/i }));
    expect(props.onCopy).toHaveBeenCalledWith('INVITEX1');
  });

  it('muestra el error de invitación', () => {
    renderFriends({ inviteError: 'Error del servidor al generar invitación' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      /error del servidor al generar invitación/i,
    );
  });

  it('muestra el error de carga de la lista', () => {
    renderFriends({ error: true });
    expect(
      screen.getByText(/no se han podido cargar las familias amigas/i),
    ).toBeInTheDocument();
  });

  it('pide confirmación antes de quitar una amistad', async () => {
    const user = userEvent.setup();
    const { props } = renderFriends({ friends: MOCK_FRIENDS });

    const quitarButtons = screen.getAllByRole('button', { name: /quitar/i });
    const firstQuitarBtn = quitarButtons[0];
    expect(firstQuitarBtn).toBeDefined();
    await user.click(firstQuitarBtn!);

    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    // No debe quitar hasta confirmar
    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it('invoca onRemove con el linkId tras confirmar', async () => {
    const user = userEvent.setup();
    const { props } = renderFriends({ friends: MOCK_FRIENDS });

    const quitarButtons = screen.getAllByRole('button', { name: /quitar/i });
    await user.click(quitarButtons[0]!);
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(props.onRemove).toHaveBeenCalledWith('link-1');
  });

  it('invoca onGoRedeem al pulsar "Canjear código de amistad"', async () => {
    const user = userEvent.setup();
    const { props } = renderFriends();
    await user.click(screen.getByRole('button', { name: /canjear código de amistad/i }));
    expect(props.onGoRedeem).toHaveBeenCalledOnce();
  });
});

// ── Tests: FriendRedeemView ─────────────────────────────────────────────────

describe('FriendRedeemView', () => {
  it('muestra el formulario de canje', () => {
    renderRedeem();
    expect(
      screen.getByRole('heading', { name: /canjear código de amistad/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/código de invitación/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /canjear código/i })).toBeInTheDocument();
  });

  it('muestra el nombre de la familia activa en la descripción', () => {
    renderRedeem({ familyName: 'Familia Pérez' });
    expect(screen.getByText('Familia Pérez')).toBeInTheDocument();
  });

  it('invoca onCodeChange al escribir en el campo', async () => {
    const user = userEvent.setup();
    const { props } = renderRedeem();
    await user.type(screen.getByLabelText(/código de invitación/i), 'A');
    expect(props.onCodeChange).toHaveBeenCalledWith('A');
  });

  it('invoca onSubmit al enviar el formulario', async () => {
    const user = userEvent.setup();
    const { props } = renderRedeem({ code: 'INVITEX1' });
    await user.click(screen.getByRole('button', { name: /canjear código/i }));
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('muestra el mensaje de error', () => {
    renderRedeem({ error: 'Introduce el código de invitación.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/introduce el código de invitación/i);
  });
});
