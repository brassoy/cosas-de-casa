/**
 * Test mínimo de render de la landing de marketing.
 *
 * La landing usa `<Link>` de TanStack Router, que sin RouterProvider necesita
 * contexto. Lo mockeamos para que renderice un `<a href>` plano: así el test es
 * unitario y podemos comprobar que el titular aparece y que hay un CTA a /signup.
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('muestra el titular principal de marca', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: /toda tu casa/i })).toBeInTheDocument();
  });

  it('ofrece al menos un CTA que lleva a /signup', () => {
    render(<LandingPage />);
    const signupLinks = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/signup');
    expect(signupLinks.length).toBeGreaterThan(0);
  });

  it('incluye un enlace para iniciar sesión (/login)', () => {
    render(<LandingPage />);
    const loginLinks = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/login');
    expect(loginLinks.length).toBeGreaterThan(0);
  });
});
