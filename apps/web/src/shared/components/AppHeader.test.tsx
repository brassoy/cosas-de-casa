import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('renders the app name', () => {
    render(<AppHeader />);
    expect(screen.getByRole('heading', { name: /cosas de casa/i })).toBeInTheDocument();
  });

  it('renders the theme toggle button', () => {
    render(<AppHeader />);
    expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument();
  });
});
