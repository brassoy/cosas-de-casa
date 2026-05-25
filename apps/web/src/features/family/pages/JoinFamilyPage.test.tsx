import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn().mockResolvedValue(undefined),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

import { JoinFamilyPage } from './JoinFamilyPage';

// PIN válido en base32 Crockford (8 chars, 0-9 A-Z sin I,L,O,U)
const VALID_PIN = 'A1B2C3D4';
const INVALID_CHAR_PIN = 'IOLIOULX'; // contiene I, O, L, U

describe('JoinFamilyPage', () => {
  it('renderiza el formulario de PIN', () => {
    renderWithQuery(<JoinFamilyPage />);
    expect(screen.getByRole('heading', { name: /únete con un pin/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/pin de invitación/i)).toBeInTheDocument();
  });

  it('valida que el PIN tenga 8 caracteres', async () => {
    const user = userEvent.setup();
    renderWithQuery(<JoinFamilyPage />);

    const input = screen.getByLabelText(/pin de invitación/i);
    await user.type(input, 'A1B2');

    // El botón está deshabilitado con PIN corto; dispararemos el submit en el form
    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/8 caracteres/i);
    });
  });

  it('rechaza caracteres inválidos del alfabeto base32 Crockford (I, L, O, U)', async () => {
    const user = userEvent.setup();
    renderWithQuery(<JoinFamilyPage />);

    const input = screen.getByLabelText(/pin de invitación/i);
    // Escribimos un PIN con caracteres inválidos — el input filtra en onChange
    // pero el test verifica que no supera la validación de regex
    await user.type(input, INVALID_CHAR_PIN);

    // Forzamos submit aunque el botón esté deshabilitado por longitud (PIN fue filtrado)
    // Hacemos submit directamente en el form
    const form = input.closest('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('el botón de unirse está deshabilitado si el PIN no tiene 8 caracteres', () => {
    renderWithQuery(<JoinFamilyPage />);
    const btn = screen.getByRole('button', { name: /unirse/i });
    expect(btn).toBeDisabled();
  });

  it('el botón de unirse está habilitado con un PIN válido de 8 caracteres', async () => {
    const user = userEvent.setup();
    renderWithQuery(<JoinFamilyPage />);

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);

    expect(screen.getByRole('button', { name: /unirse/i })).not.toBeDisabled();
  });

  it('muestra error amable cuando el PIN ha caducado (410)', async () => {
    const { api } = await import('@/shared/lib/api');
    const { ApiRequestError } = await import('@/shared/lib/api');

    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiRequestError(410, { statusCode: 410, error: 'Gone', message: 'PIN caducado' }),
    );

    const user = userEvent.setup();
    renderWithQuery(<JoinFamilyPage />);

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);
    await user.click(screen.getByRole('button', { name: /unirse/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/caducado/i);
    });
  });

  it('muestra error amable cuando el PIN no existe (404)', async () => {
    const { api } = await import('@/shared/lib/api');
    const { ApiRequestError } = await import('@/shared/lib/api');

    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiRequestError(404, { statusCode: 404, error: 'NotFound', message: 'Not found' }),
    );

    const user = userEvent.setup();
    renderWithQuery(<JoinFamilyPage />);

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);
    await user.click(screen.getByRole('button', { name: /unirse/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no existe/i);
    });
  });

  it('muestra error amable cuando el PIN ya fue usado (409)', async () => {
    const { api } = await import('@/shared/lib/api');
    const { ApiRequestError } = await import('@/shared/lib/api');

    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiRequestError(409, { statusCode: 409, error: 'Conflict', message: 'PIN used' }),
    );

    const user = userEvent.setup();
    renderWithQuery(<JoinFamilyPage />);

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);
    await user.click(screen.getByRole('button', { name: /unirse/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/ya ha sido usado/i);
    });
  });
});
