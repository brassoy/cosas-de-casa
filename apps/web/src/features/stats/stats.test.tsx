/**
 * Tests de la feature stats (vista presentacional `base`).
 *
 * Tras la migración a themes, el render vive en la vista presentacional
 * `views/base/StatsView` (props in / nada out). El container `StatsPage` solo
 * cablea el read-model y delega en `ThemeView`, así que los tests de UI apuntan
 * directamente a la vista, que es donde está la lógica de presentación.
 *
 * Cubre:
 *  1. Render básico, estado vacío, carga, error
 *  2. Ranking — medallas 🥇🥈🥉, puntos, logros (⭐ por badges con earnedAt)
 *  3. Resumen del hogar — contadores globales
 *  4. Contribución por miembro — barras de progreso, racha 🔥, nombres
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import type { LeaderboardEntryDto, StatsDto, BadgeDto } from './types';
import type { StatsViewProps } from './views/types';
import StatsView from './views/base/StatsView';

// ── Factories de datos ──────────────────────────────────────────────────────

const makeBadge = (overrides: Partial<BadgeDto> = {}): BadgeDto => ({
  id: 'badge-1',
  name: 'Primera tarea',
  description: 'Completaste tu primera tarea',
  earnedAt: null,
  ...overrides,
});

const makeLeaderboardEntry = (overrides: Partial<LeaderboardEntryDto> = {}): LeaderboardEntryDto => ({
  userId: 'user-1',
  displayName: 'Ana García',
  email: 'ana@example.com',
  rank: 1,
  points: 150,
  badges: [],
  ...overrides,
});

const makeStats = (overrides: Partial<StatsDto> = {}): StatsDto => ({
  familyId: 'family-1',
  totalTasksCompleted: 24,
  totalShoppingItemsAdded: 87,
  totalFridgeItemsAdded: 12,
  members: [
    {
      userId: 'user-1',
      displayName: 'Ana García',
      email: 'ana@example.com',
      shoppingItemsAdded: 60,
      tasksCompleted: 18,
      fridgeItemsAdded: 8,
      points: 150,
      currentStreak: 3,
      badges: [],
    },
    {
      userId: 'user-2',
      displayName: 'Luis Pérez',
      email: 'luis@example.com',
      shoppingItemsAdded: 27,
      tasksCompleted: 6,
      fridgeItemsAdded: 4,
      points: 80,
      currentStreak: 0,
      badges: [],
    },
  ],
  ...overrides,
});

// ── Helper de render ────────────────────────────────────────────────────────

function renderView(overrides: Partial<StatsViewProps> = {}) {
  const props: StatsViewProps = {
    leaderboard: [],
    stats: null,
    leaderboardLoading: false,
    statsLoading: false,
    error: null,
    ...overrides,
  };
  return render(<StatsView {...props} />);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Render básico
// ─────────────────────────────────────────────────────────────────────────────

describe('StatsView — render básico', () => {
  it('renderiza el título principal', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renderiza la sección de ranking', () => {
    renderView();
    expect(screen.getByRole('heading', { name: /ranking/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay entradas en el ranking', () => {
    renderView({ leaderboard: [] });
    expect(screen.getByText(/no hay actividad/i)).toBeInTheDocument();
  });

  it('muestra un mensaje de error cuando el ranking falla', () => {
    renderView({ error: 'No se ha podido cargar el ranking.' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ranking — medallas y datos
// ─────────────────────────────────────────────────────────────────────────────

describe('Ranking — medallas y datos', () => {
  it('muestra la medalla 🥇 para el primer puesto', () => {
    renderView({
      leaderboard: [makeLeaderboardEntry({ rank: 1, displayName: 'Ana García', points: 150 })],
    });
    const list = screen.getByRole('list', { name: /ranking/i });
    expect(within(list).getByText('🥇')).toBeInTheDocument();
  });

  it('muestra 🥇🥈🥉 para el top 3', () => {
    renderView({
      leaderboard: [
        makeLeaderboardEntry({ rank: 1, userId: 'u1', displayName: 'Ana', points: 150 }),
        makeLeaderboardEntry({ rank: 2, userId: 'u2', displayName: 'Luis', points: 100 }),
        makeLeaderboardEntry({ rank: 3, userId: 'u3', displayName: 'Marta', points: 60 }),
      ],
    });
    const list = screen.getByRole('list', { name: /ranking/i });
    expect(within(list).getByText('🥇')).toBeInTheDocument();
    expect(within(list).getByText('🥈')).toBeInTheDocument();
    expect(within(list).getByText('🥉')).toBeInTheDocument();
  });

  it('muestra los puntos de cada miembro', () => {
    renderView({
      leaderboard: [
        makeLeaderboardEntry({ rank: 1, userId: 'u1', displayName: 'Ana', points: 150 }),
        makeLeaderboardEntry({ rank: 2, userId: 'u2', displayName: 'Luis', points: 80 }),
      ],
    });
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('muestra el badge de logros cuando hay badges ganados', () => {
    renderView({
      leaderboard: [
        makeLeaderboardEntry({
          rank: 1,
          displayName: 'Ana',
          badges: [
            makeBadge({ id: 'b1', earnedAt: new Date().toISOString() }),
            makeBadge({ id: 'b2', earnedAt: new Date().toISOString() }),
            makeBadge({ id: 'b3', earnedAt: null }),
          ],
        }),
      ],
    });
    // 2 badges ganados (earnedAt != null)
    expect(screen.getByText(/⭐.*2/i)).toBeInTheDocument();
  });

  it('no muestra badge de logros cuando no hay badges ganados', () => {
    renderView({
      leaderboard: [makeLeaderboardEntry({ rank: 1, displayName: 'Ana', badges: [] })],
    });
    expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
  });

  it('renderiza los nombres de los miembros del ranking', () => {
    renderView({
      leaderboard: [
        makeLeaderboardEntry({ rank: 1, userId: 'u1', displayName: 'Ana García', points: 150 }),
        makeLeaderboardEntry({ rank: 2, userId: 'u2', displayName: 'Luis Pérez', points: 80 }),
      ],
    });
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('usa el email como nombre si displayName es null', () => {
    renderView({
      leaderboard: [
        makeLeaderboardEntry({ rank: 1, displayName: null, email: 'sinombre@example.com' }),
      ],
    });
    expect(screen.getByText('sinombre@example.com')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Resumen del hogar — contadores
// ─────────────────────────────────────────────────────────────────────────────

describe('Resumen del hogar', () => {
  it('muestra los contadores globales cuando hay datos', () => {
    renderView({ stats: makeStats() });
    expect(screen.getByText('24')).toBeInTheDocument(); // totalTasksCompleted
    expect(screen.getByText('87')).toBeInTheDocument(); // totalShoppingItemsAdded
    expect(screen.getByText('12')).toBeInTheDocument(); // totalFridgeItemsAdded
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Contribución por miembro
// ─────────────────────────────────────────────────────────────────────────────

describe('Contribución por miembro', () => {
  it('renderiza una fila por cada miembro', () => {
    renderView({ stats: makeStats() });
    const list = screen.getByRole('list', { name: /contribución/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('muestra las etiquetas de las barras de progreso', () => {
    renderView({ stats: makeStats() });
    expect(screen.getAllByText(/ítems añadidos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tareas completadas/i).length).toBeGreaterThan(0);
  });

  it('no renderiza la sección si no hay miembros', () => {
    renderView({ stats: makeStats({ members: [] }) });
    expect(screen.queryByRole('list', { name: /contribución/i })).not.toBeInTheDocument();
  });

  it('muestra el badge de racha cuando currentStreak > 0', () => {
    renderView({
      stats: makeStats({
        members: [
          {
            userId: 'user-1',
            displayName: 'Ana García',
            email: 'ana@example.com',
            shoppingItemsAdded: 60,
            tasksCompleted: 18,
            fridgeItemsAdded: 8,
            points: 150,
            currentStreak: 5,
            badges: [],
          },
        ],
      }),
    });
    expect(screen.getByText(/🔥.*5d/i)).toBeInTheDocument();
  });

  it('no muestra badge de racha cuando currentStreak = 0', () => {
    renderView({
      stats: makeStats({
        members: [
          {
            userId: 'user-1',
            displayName: 'Ana García',
            email: 'ana@example.com',
            shoppingItemsAdded: 60,
            tasksCompleted: 18,
            fridgeItemsAdded: 8,
            points: 150,
            currentStreak: 0,
            badges: [],
          },
        ],
      }),
    });
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
  });
});
