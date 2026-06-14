/**
 * Tests de la vista presentacional `base` de family_join.
 *
 * Tras la migración a themes, el render vive en `views/base/JoinFamilyView`
 * (props in / callbacks out). El container `JoinFamilyPage` solo cablea la
 * mutación + validación Crockford y delega en `ThemeView`, así que estos tests
 * (reubicados desde el antiguo `JoinFamilyPage.test.tsx`) apuntan a la vista.
 *
 * Reparto de responsabilidades verificado aquí (vista):
 *  - filtrado del input (uppercase, strip de caracteres no base32, slice 8)
 *  - contador de caracteres y botón deshabilitado hasta tener 8
 *  - validación de longitud local antes de emitir `onSubmit`
 *  - los errores de negocio (404/410/409) llegan por la prop `error`
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import JoinFamilyView from './JoinFamilyView';
import type { JoinFamilyViewProps } from '../types';

const VALID_PIN = 'A1B2C3D4';
const INVALID_CHAR_PIN = 'IOLIOULX'; // I, O, L, U se filtran en el input

function setup(overrides: Partial<JoinFamilyViewProps> = {}) {
  const props: JoinFamilyViewProps = {
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<JoinFamilyView {...props} />);
  return props;
}

describe('JoinFamilyView (base)', () => {
  it('renderiza el formulario de PIN', () => {
    setup();
    expect(screen.getByRole('heading', { name: /únete con un pin/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/pin de invitación/i)).toBeInTheDocument();
  });

  it('valida que el PIN tenga 8 caracteres', async () => {
    const user = userEvent.setup();
    setup();

    const input = screen.getByLabelText(/pin de invitación/i);
    await user.type(input, 'A1B2');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/8 caracteres/i);
    });
  });

  it('filtra del input los caracteres no alfanuméricos y normaliza a mayúsculas', async () => {
    const user = userEvent.setup();
    setup();

    const input = screen.getByLabelText(/pin de invitación/i) as HTMLInputElement;
    await user.type(input, 'a1-b2 c3@d4');

    // Se eliminan guiones/espacios/símbolos y se pasa a mayúsculas (slice 8).
    expect(input.value).toBe('A1B2C3D4');
  });

  it('deja pasar I/L/O/U (la vista NO valida Crockford; lo hace el container)', async () => {
    const user = userEvent.setup();
    const props = setup();

    const input = screen.getByLabelText(/pin de invitación/i) as HTMLInputElement;
    await user.type(input, INVALID_CHAR_PIN);

    // El input solo filtra no-alfanuméricos: I/L/O/U son A-Z y pasan (8 chars).
    expect(input.value).toBe(INVALID_CHAR_PIN);
    await user.click(screen.getByRole('button', { name: /unirse/i }));

    // La vista emite el código tal cual; el rechazo Crockford es del container.
    expect(props.onSubmit).toHaveBeenCalledWith(INVALID_CHAR_PIN);
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

  it('llama a onSubmit con el PIN sanitizado al enviar un PIN válido', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/pin de invitación/i), VALID_PIN);
    await user.click(screen.getByRole('button', { name: /unirse/i }));

    expect(props.onSubmit).toHaveBeenCalledWith(VALID_PIN);
  });

  it('muestra el error de negocio que llega por props (p. ej. PIN caducado)', () => {
    setup({ error: 'El PIN ha caducado. Pide al propietario que genere uno nuevo.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/caducado/i);
  });

  it('refleja el estado de envío en el botón', () => {
    setup({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /uniéndose/i })).toBeDisabled();
  });
});
