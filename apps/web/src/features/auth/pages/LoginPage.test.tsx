import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn().mockResolvedValue(undefined),
  };
});

// Reseteamos el store antes de cada test para no tener estado sucio
beforeEach(() => {
  vi.resetModules();
});

import { LoginPage } from './LoginPage';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('renderiza el formulario de inicio de sesión', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /inicia sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('muestra el botón de continuar con Google', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument();
  });

  it('valida que el email no esté vacío', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/correo electrónico es obligatorio/i);
    });
  });

  it('valida que la contraseña tenga al menos 6 caracteres', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/al menos 6 caracteres/i);
    });
  });

  it('llama a signIn con las credenciales correctas', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce(
      { data: { user: null as never, session: null as never }, error: null },
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'pablo@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'pablo@example.com',
        password: 'secreto123',
      });
    });
  });

  it('muestra error cuando Supabase falla', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { name: 'AuthError', message: 'Credenciales incorrectas', status: 400 },
    } as never);

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'pablo@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
