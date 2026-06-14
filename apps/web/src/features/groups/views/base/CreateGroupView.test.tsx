import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CreateGroupView from './CreateGroupView';
import type { CreateGroupViewProps } from '../types';

function setup(overrides: Partial<CreateGroupViewProps> = {}) {
  const props: CreateGroupViewProps = {
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<CreateGroupView {...props} />);
  return props;
}

describe('CreateGroupView (base)', () => {
  it('renderiza el formulario de creación', () => {
    setup();
    expect(screen.getByRole('heading', { name: /crea una peña/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear peña/i })).toBeInTheDocument();
  });

  it('valida que el nombre sea obligatorio', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: /crear peña/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre.*obligatorio/i)).toBeInTheDocument();
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('llama a onSubmit con el nombre saneado (trim) y la descripción', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nombre/i), '  Mi Peña  ');
    await user.type(screen.getByLabelText(/descripción/i), '  Los mejores  ');
    await user.click(screen.getByRole('button', { name: /crear peña/i }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith({
        name: 'Mi Peña',
        description: 'Los mejores',
      });
    });
  });

  it('omite la descripción cuando está vacía', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText(/nombre/i), 'Mi Peña');
    await user.click(screen.getByRole('button', { name: /crear peña/i }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith({
        name: 'Mi Peña',
        description: undefined,
      });
    });
  });

  it('muestra el error de negocio que llega por props', () => {
    setup({ error: 'Nombre ya en uso' });
    expect(screen.getByText(/nombre ya en uso/i)).toBeInTheDocument();
  });
});
