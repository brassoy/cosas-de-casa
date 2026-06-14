import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import JoinGroupView from './JoinGroupView';
import type { JoinGroupViewProps } from '../types';

// PIN válido en base32 Crockford (8 chars, 0-9 A-Z sin I, L, O, U)
const VALID_PIN = 'A1B2C3D4';
const INVALID_CHAR_PIN = 'IOLIOULX'; // contiene I, O, L, U

function setup(overrides: Partial<JoinGroupViewProps> = {}) {
  const props: JoinGroupViewProps = {
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<JoinGroupView {...props} />);
  return props;
}

describe('JoinGroupView (base)', () => {
  it('renderiza el formulario de PIN', () => {
    setup();
    expect(screen.getByRole('heading', { name: /únete con un pin/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/pin de invitación/i)).toBeInTheDocument();
  });

  it('valida que el PIN tenga 8 caracteres', async () => {
    const user = userEvent.setup();
    const props = setup();

    const input = screen.getByLabelText(/pin de invitación/i);
    await user.type(input, 'A1B2');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/8 caracteres/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('rechaza un PIN con caracteres no válidos del alfabeto Crockford (I, L, O, U)', async () => {
    const user = userEvent.setup();
    const props = setup();

    // El input solo filtra no-alfanuméricos; I/L/O/U pasan y los rechaza el
    // regex Crockford al enviar (igual que el flujo real de family/groups).
    const input = screen.getByLabelText<HTMLInputElement>(/pin de invitación/i);
    await user.type(input, INVALID_CHAR_PIN);
    expect(input.value).toBe(INVALID_CHAR_PIN);

    await user.click(screen.getByRole('button', { name: /unirse/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no válidos/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('el botón de unirse está deshabilitado si el PIN no tiene 8 caracteres', () => {
    setup();
    expect(screen.getByRole('button', { name: /unirse/i })).toBeDisabled();
  });

  it('el botón de unirse está habilitado con un PIN válido de 8 caracteres', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);

    expect(screen.getByRole('button', { name: /unirse/i })).not.toBeDisabled();
  });

  it('llama a onSubmit con el PIN cuando es válido', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);
    await user.click(screen.getByRole('button', { name: /unirse/i }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith(VALID_PIN);
    });
  });

  it('muestra el error de negocio que llega por props (PIN caducado)', () => {
    setup({ error: 'El PIN ha caducado. Pide al propietario que genere uno nuevo.' });
    expect(screen.getByText(/caducado/i)).toBeInTheDocument();
  });
});
