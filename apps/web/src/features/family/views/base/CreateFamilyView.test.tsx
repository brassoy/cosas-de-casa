/**
 * Tests de la vista presentacional `base` de family_create.
 *
 * Presentacional puro: la validación de "nombre obligatorio" es UI (vive en la
 * vista); el error de negocio llega por la prop `error`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CreateFamilyView from './CreateFamilyView';
import type { CreateFamilyViewProps } from '../types';

function setup(overrides: Partial<CreateFamilyViewProps> = {}) {
  const props: CreateFamilyViewProps = {
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<CreateFamilyView {...props} />);
  return props;
}

describe('CreateFamilyView (base)', () => {
  it('renderiza el formulario de creación', () => {
    setup();
    expect(screen.getByRole('heading', { name: /crea tu unidad familiar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
  });

  it('valida que el nombre no esté vacío', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: /crear unidad familiar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/nombre.*obligatorio/i);
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('llama a onSubmit con el nombre (trim) y la descripción opcional', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nombre/i), '  Casa García  ');
    await user.type(screen.getByLabelText(/descripción/i), 'Nuestro hogar');
    await user.click(screen.getByRole('button', { name: /crear unidad familiar/i }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      name: 'Casa García',
      description: 'Nuestro hogar',
    });
  });

  it('omite la descripción cuando está vacía', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Casa García');
    await user.click(screen.getByRole('button', { name: /crear unidad familiar/i }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      name: 'Casa García',
      description: undefined,
    });
  });

  it('muestra el error de negocio que llega por props', () => {
    setup({ error: 'No se ha podido crear la unidad familiar.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido crear/i);
  });

  it('refleja el estado de envío en el botón', () => {
    setup({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /creando/i })).toBeDisabled();
  });
});
