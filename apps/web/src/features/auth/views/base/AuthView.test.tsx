import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AuthView from './AuthView';
import type { AuthViewProps } from '../types';

function setup(overrides: Partial<AuthViewProps> = {}) {
  const props: AuthViewProps = {
    mode: 'login',
    onSubmit: vi.fn(),
    onGoogle: vi.fn(),
    onSwitchMode: vi.fn(),
    ...overrides,
  };
  render(<AuthView {...props} />);
  return props;
}

describe('AuthView (base) — login', () => {
  it('renderiza el formulario de inicio de sesión', () => {
    setup();
    expect(screen.getByRole('heading', { name: /inicia sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('muestra el botón de continuar con Google', () => {
    setup();
    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument();
  });

  it('valida que el email no esté vacío', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/correo electrónico es obligatorio/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('valida que la contraseña tenga al menos 6 caracteres', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/al menos 6 caracteres/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('llama a onSubmit con las credenciales (email trim) cuando son válidas', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/correo electrónico/i), 'pablo@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith({
        email: 'pablo@example.com',
        password: 'secreto123',
      });
    });
  });

  it('muestra el error de negocio que llega por props', () => {
    setup({ error: 'Credenciales incorrectas' });
    expect(screen.getByRole('alert')).toHaveTextContent(/credenciales incorrectas/i);
  });

  it('dispara onSwitchMode al pulsar el enlace de cambio', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /regístrate/i }));
    expect(props.onSwitchMode).toHaveBeenCalledOnce();
  });
});

describe('AuthView (base) — recuperar contraseña', () => {
  it('muestra el enlace "He olvidado mi contraseña" en login cuando hay handler', () => {
    setup({ onForgotPassword: vi.fn() });
    expect(
      screen.getByRole('button', { name: /he olvidado mi contraseña/i }),
    ).toBeInTheDocument();
  });

  it('NO muestra el enlace de recuperación si no se pasa onForgotPassword', () => {
    setup();
    expect(
      screen.queryByRole('button', { name: /he olvidado mi contraseña/i }),
    ).not.toBeInTheDocument();
  });

  it('NO muestra el enlace de recuperación en signup', () => {
    setup({ mode: 'signup', onForgotPassword: vi.fn() });
    expect(
      screen.queryByRole('button', { name: /he olvidado mi contraseña/i }),
    ).not.toBeInTheDocument();
  });

  it('exige el email antes de disparar la recuperación', async () => {
    const user = userEvent.setup();
    const onForgotPassword = vi.fn();
    setup({ onForgotPassword });

    await user.click(screen.getByRole('button', { name: /he olvidado mi contraseña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/escribe tu correo/i);
    });
    expect(onForgotPassword).not.toHaveBeenCalled();
  });

  it('llama a onForgotPassword con el email (trim) cuando está presente', async () => {
    const user = userEvent.setup();
    const onForgotPassword = vi.fn();
    setup({ onForgotPassword });

    await user.type(screen.getByLabelText(/correo electrónico/i), '  pablo@example.com  ');
    await user.click(screen.getByRole('button', { name: /he olvidado mi contraseña/i }));

    await waitFor(() => {
      expect(onForgotPassword).toHaveBeenCalledWith('pablo@example.com');
    });
  });

  it('muestra la confirmación de correo de recuperación con resetEmailSent', () => {
    setup({ onForgotPassword: vi.fn(), resetEmailSent: true });
    expect(screen.getByText(/te hemos enviado un correo para restablecer/i)).toBeInTheDocument();
  });
});

describe('AuthView (base) — signup', () => {
  it('renderiza el formulario de registro', () => {
    setup({ mode: 'signup' });
    expect(screen.getByRole('heading', { name: /regístrate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it('muestra el aviso de confirmación de correo con signupSuccess', () => {
    setup({ mode: 'signup', signupSuccess: true });
    expect(screen.getByText(/revisa tu correo para confirmar/i)).toBeInTheDocument();
  });
});
