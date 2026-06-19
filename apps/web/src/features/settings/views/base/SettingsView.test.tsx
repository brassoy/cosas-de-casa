import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsView from './SettingsView';
import type { SettingsViewProps } from '../types';

function setup(overrides: Partial<SettingsViewProps> = {}) {
  const props: SettingsViewProps = {
    displayName: 'Pablo',
    email: 'pablo@example.com',
    onSaveName: vi.fn(),
    onChangePassword: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };
  render(<SettingsView {...props} />);
  return props;
}

describe('SettingsView (base)', () => {
  it('renderiza las secciones de ajustes con el perfil actual', () => {
    setup();
    expect(screen.getByRole('heading', { name: /ajustes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /apariencia/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Pablo');
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue('pablo@example.com');
  });

  it('muestra el botón de cerrar sesión y dispara onLogout', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(props.onLogout).toHaveBeenCalledOnce();
  });

  it('llama a onSaveName con el nombre recortado cuando es válido', async () => {
    const user = userEvent.setup();
    const props = setup({ displayName: '' });

    await user.type(screen.getByLabelText(/nombre/i), '  Ana  ');
    await user.click(screen.getByRole('button', { name: /guardar nombre/i }));

    await waitFor(() => {
      expect(props.onSaveName).toHaveBeenCalledWith('Ana');
    });
  });

  it('no llama a onSaveName si el nombre está vacío', async () => {
    const user = userEvent.setup();
    const props = setup({ displayName: '' });

    await user.click(screen.getByRole('button', { name: /guardar nombre/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no puede estar vacío/i);
    });
    expect(props.onSaveName).not.toHaveBeenCalled();
  });

  it('valida la longitud mínima de la contraseña', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nueva contraseña/i), '123');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), '123');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/al menos 6 caracteres/i);
    });
    expect(props.onChangePassword).not.toHaveBeenCalled();
  });

  it('valida que las contraseñas coincidan', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nueva contraseña/i), 'secreto1');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'secreto2');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no coinciden/i);
    });
    expect(props.onChangePassword).not.toHaveBeenCalled();
  });

  it('llama a onChangePassword cuando la contraseña es válida y coincide', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nueva contraseña/i), 'secreto123');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    await waitFor(() => {
      expect(props.onChangePassword).toHaveBeenCalledWith('secreto123');
    });
  });

  it('muestra el error de negocio del nombre que llega por props', () => {
    setup({ nameError: 'El nombre ya está en uso' });
    expect(screen.getByRole('alert')).toHaveTextContent(/ya está en uso/i);
  });
});
