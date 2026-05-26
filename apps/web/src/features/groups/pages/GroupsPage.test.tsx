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

import { GroupsPage } from './GroupsPage';
import type { GroupSummaryDto } from '../contracts';

const MOCK_GROUPS: GroupSummaryDto[] = [
  {
    id: 'group-1',
    name: 'Peña Los Compadres',
    description: 'Los mejores',
    role: 'OWNER',
    updatedAt: '2026-05-01T00:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Cine del Jueves',
    role: 'MEMBER',
    updatedAt: '2026-05-02T00:00:00Z',
    createdAt: '2026-05-02T00:00:00Z',
  },
];

describe('GroupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el encabezado y los botones de acción', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<GroupsPage />);

    expect(screen.getByRole('heading', { name: /mis peñas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva peña/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unirse con pin/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay peñas', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<GroupsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/aún no perteneces a ninguna peña/i),
      ).toBeInTheDocument();
    });
  });

  it('lista las peñas del usuario', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce(MOCK_GROUPS);

    renderWithQuery(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByText('Peña Los Compadres')).toBeInTheDocument();
      expect(screen.getByText('Cine del Jueves')).toBeInTheDocument();
    });
  });

  it('muestra el rol de cada peña', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce(MOCK_GROUPS);

    renderWithQuery(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByText('Propietario')).toBeInTheDocument();
      expect(screen.getByText('Miembro')).toBeInTheDocument();
    });
  });

  it('muestra error cuando la API falla', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    renderWithQuery(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no se han podido cargar/i);
    });
  });

  it('navega a /groups/create al pulsar "Nueva peña"', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);
    const user = userEvent.setup();

    renderWithQuery(<GroupsPage />);

    await user.click(screen.getByRole('button', { name: /nueva peña/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/groups/create' });
  });

  it('navega a /groups/join al pulsar "Unirse con PIN"', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);
    const user = userEvent.setup();

    renderWithQuery(<GroupsPage />);

    await user.click(screen.getByRole('button', { name: /unirse con pin/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/groups/join' });
  });
});
