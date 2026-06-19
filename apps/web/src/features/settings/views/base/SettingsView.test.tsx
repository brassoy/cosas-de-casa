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
    onChangeEmail: vi.fn(),
    onChangePassword: vi.fn(),
    families: [{ id: 'fam-1', name: 'Los Ruiz', active: true }],
    onLeaveFamily: vi.fn(),
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
    expect(screen.getByRole('heading', { name: /familias/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /apariencia/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Pablo');
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

    await user.type(screen.getByLabelText('Nombre'), '  Ana  ');
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

  // ── Email ──────────────────────────────────────────────────────────────────

  it('llama a onChangeEmail con el email recortado cuando es válido y distinto', async () => {
    const user = userEvent.setup();
    const props = setup();

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.clear(emailInput);
    await user.type(emailInput, '  nuevo@example.com  ');
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }));

    await waitFor(() => {
      expect(props.onChangeEmail).toHaveBeenCalledWith('nuevo@example.com');
    });
  });

  it('no llama a onChangeEmail si el formato del email es inválido', async () => {
    const user = userEvent.setup();
    const props = setup();

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'no-es-un-email');
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/correo electrónico válido/i);
    });
    expect(props.onChangeEmail).not.toHaveBeenCalled();
  });

  it('no llama a onChangeEmail si el email es el mismo que el actual', async () => {
    const user = userEvent.setup();
    const props = setup();

    // El campo ya viene sembrado con el email actual; pulsar sin cambiarlo.
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/mismo que ya tienes/i);
    });
    expect(props.onChangeEmail).not.toHaveBeenCalled();
  });

  it('muestra el aviso de verificación tras solicitar el cambio de email', () => {
    setup({ emailOk: true });
    expect(screen.getByText(/revisa tu bandeja/i)).toBeInTheDocument();
  });

  // ── Contraseña ───────────────────────────────────────────────────────────────

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

  // ── Familias ─────────────────────────────────────────────────────────────────

  it('lista la familia activa y dispara onLeaveFamily al pulsar Salir', async () => {
    const user = userEvent.setup();
    const props = setup();

    expect(screen.getByText('Los Ruiz')).toBeInTheDocument();
    expect(screen.getByText(/familia activa/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^salir$/i }));
    expect(props.onLeaveFamily).toHaveBeenCalledWith('fam-1');
  });

  it('muestra un mensaje cuando no hay familias', () => {
    setup({ families: [] });
    expect(screen.getByText(/no perteneces a ninguna familia/i)).toBeInTheDocument();
  });

  it('muestra el error de salir de la familia que llega por props', () => {
    setup({ leaveError: 'No se ha podido salir de la familia.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido salir/i);
  });
});
