/**
 * Tests de la vista presentacional `base` de family_home.
 *
 * Presentacional puro: props in / callbacks out. Cubre la cabecera clicable
 * (→ Gestionar familia), el grid de accesos rápidos y las notificaciones
 * (props puras).
 *
 * La invitación por PIN, la lista de miembros y "Salir de la familia" viven
 * ahora en family_manage: sus tests están en `FamilyManageView.test.tsx`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FamilyHomeView from './FamilyHomeView';
import type { FamilyHomeViewProps, FamilyQuickAccess } from '../types';

const QUICK_ACCESS: FamilyQuickAccess[] = [
  { id: 'lists', emoji: '🛒', label: 'Listas de la compra' },
  { id: 'tasks', emoji: '✅', label: 'Tareas' },
];

function setup(overrides: Partial<FamilyHomeViewProps> = {}) {
  const props: FamilyHomeViewProps = {
    familyId: 'family-1',
    familyName: 'Casa García',
    quickAccess: QUICK_ACCESS,
    notificationsEnabled: false,
    onToggleNotifications: vi.fn(),
    onOpen: vi.fn(),
    onManageFamily: vi.fn(),
    ...overrides,
  };
  render(<FamilyHomeView {...props} />);
  return props;
}

describe('FamilyHomeView (base) — cabecera y accesos', () => {
  it('muestra el nombre de la familia', () => {
    setup();
    expect(screen.getByRole('heading', { name: /casa garcía/i })).toBeInTheDocument();
  });

  it('la cabecera es clicable y dispara onManageFamily', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /gestionar familia/i }));
    expect(props.onManageFamily).toHaveBeenCalledOnce();
  });

  it('renderiza un tile por cada acceso rápido', () => {
    setup();
    expect(screen.getByRole('button', { name: /listas de la compra/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tareas/i })).toBeInTheDocument();
  });

  it('dispara onOpen con el id del acceso al pulsar un tile', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /listas de la compra/i }));
    expect(props.onOpen).toHaveBeenCalledWith('lists');
  });
});

describe('FamilyHomeView (base) — notificaciones', () => {
  it('dispara onToggleNotifications al cambiar el switch', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('switch', { name: /activar notificaciones/i }));
    expect(props.onToggleNotifications).toHaveBeenCalled();
  });

  it('el switch refleja el estado activo', () => {
    setup({ notificationsEnabled: true });
    expect(screen.getByRole('switch', { name: /activar notificaciones/i })).toBeChecked();
  });

  it('deshabilita el switch cuando las notificaciones no están disponibles', () => {
    setup({ notificationsDisabled: true });
    expect(screen.getByRole('switch', { name: /activar notificaciones/i })).toBeDisabled();
  });
});

// ── Secciones movidas a "Gestionar familia" ───────────────────────────────────
// Guardamos que la home ya no renderiza invitación por PIN, lista de miembros ni
// "Salir de la familia" (viven en family_manage).

describe('FamilyHomeView (base) — sin secciones de gestión', () => {
  it('no renderiza invitación, miembros ni salir de la familia', () => {
    setup();
    expect(screen.queryByRole('heading', { name: /invitar miembros/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /miembros/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /salir de la familia/i }),
    ).not.toBeInTheDocument();
  });
});
