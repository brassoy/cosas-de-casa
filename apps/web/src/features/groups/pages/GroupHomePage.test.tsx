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
    useParams: () => ({ groupId: 'group-abc' }),
  };
});

// Simula usuario autenticado con id conocido
vi.mock('@/features/auth/store/auth.store', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/auth/store/auth.store')>();
  return {
    ...actual,
    useAuthStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
      selector({ user: { id: 'user-owner' } }),
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

import { GroupHomePage } from './GroupHomePage';
import type { GroupMemberDto } from '../contracts';

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

describe('GroupHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra los miembros de la peña', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER, REGULAR_MEMBER]);

    renderWithQuery(<GroupHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Propietario Test')).toBeInTheDocument();
      expect(screen.getByText('Otro Usuario')).toBeInTheDocument();
    });
  });

  it('muestra el botón de generar PIN solo para el OWNER', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER, REGULAR_MEMBER]);

    renderWithQuery(<GroupHomePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generar pin/i })).toBeInTheDocument();
    });
  });

  it('genera un PIN y lo muestra con opciones de compartir', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER, REGULAR_MEMBER]);
    vi.mocked(api.post).mockResolvedValueOnce({
      code: 'XY12AB34',
      expiresAt: '2026-05-27T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithQuery(<GroupHomePage />);

    await waitFor(() => screen.getByRole('button', { name: /generar pin/i }));
    await user.click(screen.getByRole('button', { name: /generar pin/i }));

    await waitFor(() => {
      expect(screen.getByText('XY12AB34')).toBeInTheDocument();
      expect(screen.getByText(/compartir por whatsapp/i)).toBeInTheDocument();
      expect(screen.getByText(/compartir por telegram/i)).toBeInTheDocument();
    });
  });

  it('muestra error si la generación del PIN falla', async () => {
    const { api } = await import('@/shared/lib/api');
    const { ApiRequestError } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER]);
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiRequestError(500, { statusCode: 500, error: 'InternalServerError', message: 'Error del servidor' }),
    );

    const user = userEvent.setup();
    renderWithQuery(<GroupHomePage />);

    await waitFor(() => screen.getByRole('button', { name: /generar pin/i }));
    await user.click(screen.getByRole('button', { name: /generar pin/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/error del servidor/i);
    });
  });

  it('muestra el botón de salir de la peña', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER]);

    renderWithQuery(<GroupHomePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salir de la peña/i })).toBeInTheDocument();
    });
  });

  it('pide confirmación antes de salir de la peña', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER]);

    const user = userEvent.setup();
    renderWithQuery(<GroupHomePage />);

    await waitFor(() => screen.getByRole('button', { name: /salir de la peña/i }));
    await user.click(screen.getByRole('button', { name: /salir de la peña/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  it('navega a /groups tras confirmar la salida', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([OWNER_MEMBER]);
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderWithQuery(<GroupHomePage />);

    await waitFor(() => screen.getByRole('button', { name: /salir de la peña/i }));
    await user.click(screen.getByRole('button', { name: /salir de la peña/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/groups' });
    });
  });
});
