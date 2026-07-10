/**
 * Tests del ConfirmDialog compartido (sustituto de `window.confirm`).
 * Controlado: `open` + callbacks `onConfirm`/`onCancel`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

function setup(overrides: Partial<ConfirmDialogProps> = {}) {
  const props: ConfirmDialogProps = {
    open: true,
    title: '¿Salir de la familia?',
    description: 'Perderás el acceso a sus listas.',
    confirmLabel: 'Salir de la familia',
    cancelLabel: 'Cancelar',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ConfirmDialog {...props} />);
  return props;
}

describe('ConfirmDialog', () => {
  it('muestra título y descripción cuando está abierto', () => {
    setup();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('¿Salir de la familia?')).toBeInTheDocument();
    expect(screen.getByText(/perderás el acceso/i)).toBeInTheDocument();
  });

  it('no renderiza nada cuando está cerrado', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dispara onConfirm al pulsar el botón de confirmar', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /salir de la familia/i }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('dispara onCancel al pulsar el botón de cancelar', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(props.onCancel).toHaveBeenCalledOnce();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('dispara onCancel al cerrar con Escape', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.keyboard('{Escape}');
    expect(props.onCancel).toHaveBeenCalledOnce();
  });
});
