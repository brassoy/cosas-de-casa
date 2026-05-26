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

import { CreateGroupPage } from './CreateGroupPage';

describe('CreateGroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el formulario de creación', () => {
    renderWithQuery(<CreateGroupPage />);
    expect(screen.getByRole('heading', { name: /crea una peña/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear peña/i })).toBeInTheDocument();
  });

  it('valida que el nombre sea obligatorio', async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateGroupPage />);

    await user.click(screen.getByRole('button', { name: /crear peña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/nombre.*obligatorio/i);
    });
  });

  it('crea la peña y navega al detalle', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'new-group',
      name: 'Mi Peña',
      role: 'OWNER',
      updatedAt: '2026-05-01T00:00:00Z',
      createdAt: '2026-05-01T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithQuery(<CreateGroupPage />);

    await user.type(screen.getByLabelText(/nombre/i), 'Mi Peña');
    await user.click(screen.getByRole('button', { name: /crear peña/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/groups/$groupId',
        params: { groupId: 'new-group' },
      });
    });
  });

  it('muestra error cuando la API falla', async () => {
    const { api } = await import('@/shared/lib/api');
    const { ApiRequestError } = await import('@/shared/lib/api');
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiRequestError(422, {
        statusCode: 422,
        error: 'UnprocessableEntity',
        message: 'Nombre ya en uso',
      }),
    );

    const user = userEvent.setup();
    renderWithQuery(<CreateGroupPage />);

    await user.type(screen.getByLabelText(/nombre/i), 'Nombre duplicado');
    await user.click(screen.getByRole('button', { name: /crear peña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/nombre ya en uso/i);
    });
  });
});
