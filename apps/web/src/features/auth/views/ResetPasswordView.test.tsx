import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ResetPasswordView, { type ResetPasswordViewProps } from './ResetPasswordView';

function setup(overrides: Partial<ResetPasswordViewProps> = {}) {
  const props: ResetPasswordViewProps = {
    hasRecoverySession: true,
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<ResetPasswordView {...props} />);
  return props;
}

describe('ResetPasswordView', () => {
  it('renderiza el formulario de nueva contraseña con sesión de recuperación', () => {
    setup();
    expect(screen.getByRole('heading', { name: /nueva contraseña/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/repite la contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar contraseña/i })).toBeInTheDocument();
  });

  it('muestra aviso de enlace no válido cuando no hay sesión de recuperación', () => {
    setup({ hasRecoverySession: false });
    expect(screen.getByRole('alert')).toHaveTextContent(/enlace de recuperación no es válido/i);
    expect(screen.queryByLabelText(/^nueva contraseña$/i)).not.toBeInTheDocument();
  });

  it('valida que la contraseña tenga al menos 6 caracteres', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/^nueva contraseña$/i), '123');
    await user.type(screen.getByLabelText(/repite la contraseña/i), '123');
    await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/al menos 6 caracteres/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('valida que ambas contraseñas coincidan', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/^nueva contraseña$/i), 'secreto123');
    await user.type(screen.getByLabelText(/repite la contraseña/i), 'otracosa123');
    await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no coinciden/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('llama a onSubmit con la contraseña cuando es válida y coincide', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/^nueva contraseña$/i), 'secreto123');
    await user.type(screen.getByLabelText(/repite la contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith('secreto123');
    });
  });

  it('muestra el error de negocio que llega por props', () => {
    setup({ error: 'No se pudo actualizar la contraseña' });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo actualizar/i);
  });
});
