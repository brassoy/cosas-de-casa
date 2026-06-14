/**
 * Tests del componente ThemeSelector.
 *
 * Verifica:
 * 1. Render y accesibilidad básica
 * 2. Abrir/cerrar el panel
 * 3. Cambiar modo (light/dark) → data-mode en <html>
 * 4. Cambiar theme → data-theme en <html>
 * 5. Persistencia en localStorage ({ theme, mode })
 * 6. Cierre con tecla Escape
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Importar tras los mocks para que theme-bootstrap use el DOM mockeado
import { ThemeSelector } from './ThemeSelector';
import { applyTheme } from '../theme/theme-bootstrap';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHtml() {
  return document.documentElement;
}

function openPanel() {
  const trigger = screen.getByRole('button', { name: /cambiar tema/i });
  fireEvent.click(trigger);
  return trigger;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Limpiar estado
  localStorage.clear();
  getHtml().removeAttribute('data-theme');
  getHtml().removeAttribute('data-mode');
  // Aplicar defaults para que el componente lea un estado limpio
  applyTheme();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ThemeSelector', () => {
  it('renderiza el botón de tema', () => {
    render(<ThemeSelector />);
    expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument();
  });

  it('el panel está cerrado inicialmente', () => {
    render(<ThemeSelector />);
    expect(screen.queryByRole('dialog', { name: /selector de tema/i })).not.toBeInTheDocument();
  });

  it('abre el panel al hacer clic en el botón', async () => {
    render(<ThemeSelector />);
    openPanel();
    expect(screen.getByRole('dialog', { name: /selector de tema/i })).toBeInTheDocument();
  });

  it('cierra el panel con la tecla Escape', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    openPanel();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cambia a modo oscuro y actualiza data-mode en <html>', () => {
    // Partir de light
    applyTheme({ mode: 'light', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    const darkBtn = screen.getByRole('button', { name: /◑ oscuro/i });
    fireEvent.click(darkBtn);

    expect(getHtml().getAttribute('data-mode')).toBe('dark');
  });

  it('cambia a modo claro y actualiza data-mode en <html>', () => {
    applyTheme({ mode: 'dark', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    const lightBtn = screen.getByRole('button', { name: /○ claro/i });
    fireEvent.click(lightBtn);

    expect(getHtml().getAttribute('data-mode')).toBe('light');
  });

  it('cambia al theme cozy y actualiza data-theme en <html>', () => {
    applyTheme({ mode: 'light', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    const cozyBtn = screen.getByRole('button', { name: /cuaderno/i });
    fireEvent.click(cozyBtn);

    expect(getHtml().getAttribute('data-theme')).toBe('cozy');
  });

  it('cambia al theme springfield y actualiza data-theme en <html>', () => {
    applyTheme({ mode: 'light', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    const springfieldBtn = screen.getByRole('button', { name: /cómic/i });
    fireEvent.click(springfieldBtn);

    expect(getHtml().getAttribute('data-theme')).toBe('springfield');
  });

  it('persiste el theme en localStorage', () => {
    applyTheme({ mode: 'light', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    const cozyBtn = screen.getByRole('button', { name: /cuaderno/i });
    fireEvent.click(cozyBtn);

    const stored = JSON.parse(localStorage.getItem('cosasdecasa:theme') ?? '{}') as {
      theme?: string;
      mode?: string;
    };
    expect(stored.theme).toBe('cozy');
  });

  it('persiste el modo en localStorage', () => {
    applyTheme({ mode: 'light', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /◑ oscuro/i }));

    const stored = JSON.parse(localStorage.getItem('cosasdecasa:theme') ?? '{}') as {
      theme?: string;
      mode?: string;
    };
    expect(stored.mode).toBe('dark');
  });

  it('migra el formato viejo {aesthetic,...} a base sin crash', () => {
    // Formato legacy en localStorage → loadPrefs no valida (sin `theme`), se
    // descarta el objeto completo y aplicamos DEFAULT_THEME sin lanzar error.
    localStorage.setItem('cosasdecasa:theme', JSON.stringify({ aesthetic: 'pixel', mode: 'dark' }));
    getHtml().removeAttribute('data-theme');
    getHtml().removeAttribute('data-mode');

    expect(() => applyTheme()).not.toThrow();
    expect(getHtml().getAttribute('data-theme')).toBe('base');
  });

  it('el botón activo tiene aria-pressed=true', () => {
    applyTheme({ mode: 'light', theme: 'base' });
    render(<ThemeSelector />);
    openPanel();

    const lightBtn = screen.getByRole('button', { name: /○ claro/i });
    const darkBtn = screen.getByRole('button', { name: /◑ oscuro/i });

    expect(lightBtn).toHaveAttribute('aria-pressed', 'true');
    expect(darkBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
