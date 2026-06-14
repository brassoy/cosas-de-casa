/**
 * Tests de la vista presentacional `base` de onboarding.
 *
 * Presentacional puro: solo verifica render y que los botones disparan los
 * callbacks de navegación que provee el container.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OnboardingView from './OnboardingView';
import type { OnboardingViewProps } from '../types';

function setup(overrides: Partial<OnboardingViewProps> = {}) {
  const props: OnboardingViewProps = {
    onCreateFamily: vi.fn(),
    onJoinFamily: vi.fn(),
    ...overrides,
  };
  render(<OnboardingView {...props} />);
  return props;
}

describe('OnboardingView (base)', () => {
  it('renderiza el mensaje de bienvenida', () => {
    setup();
    expect(screen.getByRole('heading', { name: /bienvenido a cosas de casa/i })).toBeInTheDocument();
  });

  it('dispara onCreateFamily al pulsar "Crea tu unidad familiar"', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /crea tu unidad familiar/i }));
    expect(props.onCreateFamily).toHaveBeenCalledOnce();
  });

  it('dispara onJoinFamily al pulsar "Únete con un PIN"', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /únete con un pin/i }));
    expect(props.onJoinFamily).toHaveBeenCalledOnce();
  });
});
