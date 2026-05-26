/**
 * Tests de la feature stats (Fase 2C).
 *
 * Cubre:
 *  1. StatsPage — render básico, estado vacío, estados de carga/error
 *  2. Ranking — orden correcto, medallas 🥇🥈🥉, puntos, logros (badges)
 *  3. Resumen del hogar — contadores globales
 *  4. Contribución por miembro — barras de progreso, racha, badges
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks de infraestructura ──────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useParams: () => ({ familyId: 'family-1' }),
    useNavigate: () => vi.fn(),
  };
});

// ── Datos de muestra ──────────────────────────────────────────────────────────

import type { LeaderboardEntryDto, StatsDto, BadgeDto } from './types';

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

// ── Spies de hooks ────────────────────────────────────────────────────────────

let mockLeaderboard: LeaderboardEntryDto[] = [];
let mockLeaderboardLoading = false;
let mockLeaderboardError: Error | null = null;

let mockStats: StatsDto | undefined;
let mockStatsLoading = false;
let mockStatsError: Error | null = null;

vi.mock('@/features/stats/hooks/useStats', () => ({
  useFamilyLeaderboard: vi.fn(() => ({
    data: mockLeaderboard,
    isLoading: mockLeaderboardLoading,
    error: mockLeaderboardError,
  })),
  useFamilyStats: vi.fn(() => ({
    data: mockStats,
    isLoading: mockStatsLoading,
    error: mockStatsError,
  })),
  statsKeys: {
    all: ['stats'],
    leaderboard: (id: string) => ['stats', 'leaderboard', id],
    familyStats: (id: string) => ['stats', 'family', id],
  },
}));

// ── Helpers de render ─────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>);
}

// ── Importaciones bajo test ───────────────────────────────────────────────────

import { StatsPage } from './pages/StatsPage';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockLeaderboard = [];
  mockLeaderboardLoading = false;
  mockLeaderboardError = null;
  mockStats = undefined;
  mockStatsLoading = false;
  mockStatsError = null;
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. StatsPage — render básico
// ─────────────────────────────────────────────────────────────────────────────

describe('StatsPage — render básico', () => {
  it('renderiza el título principal', () => {
    wrap(<StatsPage />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renderiza la sección de ranking', () => {
    wrap(<StatsPage />);
    expect(screen.getByRole('heading', { name: /ranking/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay entradas en el ranking', () => {
    mockLeaderboard = [];
    wrap(<StatsPage />);
    expect(screen.getByText(/no hay actividad/i)).toBeInTheDocument();
  });

  it('muestra "Cargando ranking..." mientras carga', () => {
    mockLeaderboardLoading = true;
    mockLeaderboard = [];
    wrap(<StatsPage />);
    expect(screen.getByText(/cargando ranking/i)).toBeInTheDocument();
  });

  it('muestra un mensaje de error cuando el ranking falla', () => {
    mockLeaderboardError = new Error('Network error');
    mockLeaderboard = [];
    wrap(<StatsPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ranking — orden, medallas, datos
// ─────────────────────────────────────────────────────────────────────────────

describe('Ranking — medallas y datos', () => {
  it('muestra la medalla 🥇 para el primer puesto', () => {
    mockLeaderboard = [makeLeaderboardEntry({ rank: 1, displayName: 'Ana García', points: 150 })];
    wrap(<StatsPage />);
    const list = screen.getByRole('list', { name: /ranking/i });
    expect(within(list).getByText('🥇')).toBeInTheDocument();
  });

  it('muestra 🥇🥈🥉 para el top 3', () => {
    mockLeaderboard = [
      makeLeaderboardEntry({ rank: 1, userId: 'u1', displayName: 'Ana', points: 150 }),
      makeLeaderboardEntry({ rank: 2, userId: 'u2', displayName: 'Luis', points: 100 }),
      makeLeaderboardEntry({ rank: 3, userId: 'u3', displayName: 'Marta', points: 60 }),
    ];
    wrap(<StatsPage />);
    const list = screen.getByRole('list', { name: /ranking/i });
    expect(within(list).getByText('🥇')).toBeInTheDocument();
    expect(within(list).getByText('🥈')).toBeInTheDocument();
    expect(within(list).getByText('🥉')).toBeInTheDocument();
  });

  it('muestra los puntos de cada miembro', () => {
    mockLeaderboard = [
      makeLeaderboardEntry({ rank: 1, userId: 'u1', displayName: 'Ana', points: 150 }),
      makeLeaderboardEntry({ rank: 2, userId: 'u2', displayName: 'Luis', points: 80 }),
    ];
    wrap(<StatsPage />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('muestra el badge de logros cuando hay badges ganados', () => {
    mockLeaderboard = [
      makeLeaderboardEntry({
        rank: 1,
        displayName: 'Ana',
        badges: [
          makeBadge({ id: 'b1', earnedAt: new Date().toISOString() }),
          makeBadge({ id: 'b2', earnedAt: new Date().toISOString() }),
          makeBadge({ id: 'b3', earnedAt: null }),
        ],
      }),
    ];
    wrap(<StatsPage />);
    // 2 badges ganados (earnedAt != null)
    expect(screen.getByText(/⭐.*2/i)).toBeInTheDocument();
  });

  it('no muestra badge de logros cuando no hay badges ganados', () => {
    mockLeaderboard = [
      makeLeaderboardEntry({ rank: 1, displayName: 'Ana', badges: [] }),
    ];
    wrap(<StatsPage />);
    expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
  });

  it('renderiza los nombres de los miembros del ranking', () => {
    mockLeaderboard = [
      makeLeaderboardEntry({ rank: 1, userId: 'u1', displayName: 'Ana García', points: 150 }),
      makeLeaderboardEntry({ rank: 2, userId: 'u2', displayName: 'Luis Pérez', points: 80 }),
    ];
    wrap(<StatsPage />);
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('usa el email como nombre si displayName es null', () => {
    mockLeaderboard = [
      makeLeaderboardEntry({ rank: 1, displayName: null, email: 'sinombre@example.com' }),
    ];
    wrap(<StatsPage />);
    expect(screen.getByText('sinombre@example.com')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Resumen del hogar — contadores
// ─────────────────────────────────────────────────────────────────────────────

describe('Resumen del hogar', () => {
  it('muestra los contadores globales cuando hay datos', () => {
    mockStats = makeStats();
    wrap(<StatsPage />);
    // totalTasksCompleted
    expect(screen.getByText('24')).toBeInTheDocument();
    // totalShoppingItemsAdded
    expect(screen.getByText('87')).toBeInTheDocument();
    // totalFridgeItemsAdded
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Contribución por miembro
// ─────────────────────────────────────────────────────────────────────────────

describe('Contribución por miembro', () => {
  it('renderiza una fila por cada miembro', () => {
    mockStats = makeStats();
    wrap(<StatsPage />);
    // Hay 2 miembros en makeStats por defecto
    const list = screen.getByRole('list', { name: /contribución/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('muestra las etiquetas de las barras de progreso', () => {
    mockStats = makeStats();
    wrap(<StatsPage />);
    expect(screen.getAllByText(/ítems añadidos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tareas completadas/i).length).toBeGreaterThan(0);
  });

  it('no renderiza la sección si no hay miembros', () => {
    mockStats = makeStats({ members: [] });
    wrap(<StatsPage />);
    expect(screen.queryByRole('list', { name: /contribución/i })).not.toBeInTheDocument();
  });

  it('muestra el badge de racha cuando currentStreak > 0', () => {
    mockStats = makeStats({
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
    });
    wrap(<StatsPage />);
    expect(screen.getByText(/🔥.*5d/i)).toBeInTheDocument();
  });

  it('no muestra badge de racha cuando currentStreak = 0', () => {
    mockStats = makeStats({
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
    });
    wrap(<StatsPage />);
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
  });
});
