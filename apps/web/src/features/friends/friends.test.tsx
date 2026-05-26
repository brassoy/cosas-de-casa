import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('@/shared/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockNavigate = vi.fn().mockResolvedValue(undefined);
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/family/store/family.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/family/store/family.store')>();
  return {
    ...actual,
    useFamilyStore: (selector: (s: { activeFamily: { id: string; name: string } | null }) => unknown) =>
      selector({ activeFamily: { id: 'fam-1', name: 'Familia Pérez' } }),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ── Tests: FriendsPage ────────────────────────────────────────────────────────

import { FriendsPage } from './pages/FriendsPage';
import type { FriendFamilyDto } from './contracts';

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

describe('FriendsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el encabezado', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<FriendsPage />);

    // Usamos h2 explícito para no colisionar con el h3 "Tus familias amigas"
    expect(screen.getByRole('heading', { name: 'Familias amigas', level: 2 })).toBeInTheDocument();
  });

  it('muestra el botón de generar código de invitación', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<FriendsPage />);

    expect(
      screen.getByRole('button', { name: /generar código de invitación/i }),
    ).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay familias amigas', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<FriendsPage />);

    await waitFor(() => {
      expect(screen.getByText(/aún no tienes familias amigas/i)).toBeInTheDocument();
    });
  });

  it('lista las familias amigas', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce(MOCK_FRIENDS);

    renderWithQuery(<FriendsPage />);

    await waitFor(() => {
      expect(screen.getByText('Familia García')).toBeInTheDocument();
      expect(screen.getByText('Familia Martínez')).toBeInTheDocument();
    });
  });

  it('genera y muestra el código de invitación con opciones de compartir', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);
    vi.mocked(api.post).mockResolvedValueOnce({
      code: 'INVITEX1',
      expiresAt: '2026-05-27T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithQuery(<FriendsPage />);

    await user.click(screen.getByRole('button', { name: /generar código de invitación/i }));

    await waitFor(() => {
      expect(screen.getByText('INVITEX1')).toBeInTheDocument();
      expect(screen.getByText(/compartir por whatsapp/i)).toBeInTheDocument();
      expect(screen.getByText(/compartir por telegram/i)).toBeInTheDocument();
    });
  });

  it('muestra error cuando la API de invitación falla', async () => {
    const { api, ApiRequestError } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiRequestError(500, {
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Error del servidor al generar invitación',
      }),
    );

    const user = userEvent.setup();
    renderWithQuery(<FriendsPage />);

    await user.click(screen.getByRole('button', { name: /generar código de invitación/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /error del servidor al generar invitación/i,
      );
    });
  });

  it('muestra error cuando la API de listado falla', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    renderWithQuery(<FriendsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /no se han podido cargar las familias amigas/i,
      );
    });
  });

  it('pide confirmación antes de quitar una amistad', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce(MOCK_FRIENDS);

    const user = userEvent.setup();
    renderWithQuery(<FriendsPage />);

    // Esperamos a que aparezca la lista
    await waitFor(() => screen.getByText('Familia García'));

    // Click en "Quitar" del primer amigo
    const quitarButtons = screen.getAllByRole('button', { name: /quitar/i });
    const firstQuitarBtn = quitarButtons[0];
    expect(firstQuitarBtn).toBeDefined();
    await user.click(firstQuitarBtn!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    });
  });

  it('navega a /friends/redeem al pulsar "Canjear código"', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    const user = userEvent.setup();
    renderWithQuery(<FriendsPage />);

    await user.click(screen.getByRole('button', { name: /canjear código de amistad/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/friends/redeem' });
  });
});

// ── Tests: RedeemFriendPage ───────────────────────────────────────────────────

import { RedeemFriendPage } from './pages/RedeemFriendPage';

describe('RedeemFriendPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el formulario de canje', () => {
    renderWithQuery(<RedeemFriendPage />);

    expect(screen.getByRole('heading', { name: /canjear código de amistad/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código de invitación/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /canjear código/i })).toBeInTheDocument();
  });

  it('muestra error de validación si se envía vacío', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RedeemFriendPage />);

    await user.click(screen.getByRole('button', { name: /canjear código/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/código de invitación/i);
  });

  it('navega a /friends tras un canje exitoso', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.post).mockResolvedValueOnce({
      linkId: 'link-new',
      familyId: 'fam-1',
      familyName: 'Familia Nueva',
      since: '2026-05-26T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithQuery(<RedeemFriendPage />);

    await user.type(screen.getByLabelText(/código de invitación/i), 'INVITEX1');
    await user.click(screen.getByRole('button', { name: /canjear código/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/friends', search: {} });
    });
  });
});
