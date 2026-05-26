import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/shared/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockNavigate = vi.fn().mockResolvedValue(undefined);
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ planId: 'plan-abc' }),
  };
});

vi.mock('@/features/family/store/family.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/family/store/family.store')>();
  return {
    ...actual,
    useFamilyStore: (selector: (s: { activeFamily: { id: string; name: string } | null }) => unknown) =>
      selector({ activeFamily: { id: 'fam-1', name: 'Familia Pérez' } }),
  };
});

vi.mock('@/features/auth/store/auth.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/store/auth.store')>();
  return {
    ...actual,
    useAuthStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
      selector({ user: { id: 'user-me' } }),
  };
});

vi.mock('@/features/friends/hooks/useFriends', () => ({
  useFriendFamilies: () => ({ data: [], isLoading: false, error: null }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ── Tests: PlansPage ──────────────────────────────────────────────────────────

import { PlansPage } from './pages/PlansPage';
import type { PlanSummaryDto } from './contracts';

const MOCK_PLANS: PlanSummaryDto[] = [
  {
    id: 'plan-1',
    title: 'Barbacoa en el parque',
    status: 'proposed',
    ownerFamilyId: 'fam-1',
    participantCount: 3,
    scheduledAt: '2026-06-15T12:00:00Z',
    placeName: 'Parque del Retiro',
  },
  {
    id: 'plan-2',
    title: 'Cine el sábado',
    status: 'confirmed',
    ownerFamilyId: 'fam-1',
    participantCount: 2,
  },
];

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el encabezado y el botón de nuevo plan', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<PlansPage />);

    expect(screen.getByRole('heading', { name: /planes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nuevo plan/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay planes', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderWithQuery(<PlansPage />);

    await waitFor(() => {
      expect(screen.getByText(/no hay planes todavía/i)).toBeInTheDocument();
    });
  });

  it('lista los planes de la familia', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce(MOCK_PLANS);

    renderWithQuery(<PlansPage />);

    await waitFor(() => {
      expect(screen.getByText('Barbacoa en el parque')).toBeInTheDocument();
      expect(screen.getByText('Cine el sábado')).toBeInTheDocument();
    });
  });

  it('muestra el estado de cada plan', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce(MOCK_PLANS);

    renderWithQuery(<PlansPage />);

    await waitFor(() => {
      expect(screen.getByText('Propuesto')).toBeInTheDocument();
      expect(screen.getByText('Confirmado')).toBeInTheDocument();
    });
  });

  it('muestra error cuando la API falla', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    renderWithQuery(<PlansPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no se han podido cargar los planes/i);
    });
  });

  it('navega a /plans/create al pulsar "Nuevo plan"', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);
    const user = userEvent.setup();

    renderWithQuery(<PlansPage />);

    await user.click(screen.getByRole('button', { name: /nuevo plan/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/plans/create' });
  });
});

// ── Tests: CreatePlanPage ─────────────────────────────────────────────────────

import { CreatePlanPage } from './pages/CreatePlanPage';

describe('CreatePlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el formulario de creación de plan', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]); // savedPlaces

    renderWithQuery(<CreatePlanPage />);

    expect(screen.getByRole('heading', { name: /nuevo plan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
  });

  it('muestra error de validación si el título está vacío', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]);
    const user = userEvent.setup();

    renderWithQuery(<CreatePlanPage />);

    await user.click(screen.getByRole('button', { name: /crear plan/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/título del plan es obligatorio/i);
  });

  it('crea un plan y navega al detalle', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockResolvedValueOnce([]); // savedPlaces
    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'plan-new',
      title: 'Barbacoa del verano',
      status: 'proposed',
      ownerFamilyId: 'fam-1',
      createdBy: 'user-me',
      participants: [],
      sharedWithFamilyIds: [],
      createdAt: '2026-05-26T00:00:00Z',
    });
    const user = userEvent.setup();

    renderWithQuery(<CreatePlanPage />);

    await user.type(screen.getByLabelText(/título/i), 'Barbacoa del verano');
    await user.click(screen.getByRole('button', { name: /crear plan/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/plans/$planId',
        params: { planId: 'plan-new' },
      });
    });
  });
});

// ── Tests: PlanDetailPage ─────────────────────────────────────────────────────

import { PlanDetailPage } from './pages/PlanDetailPage';
import type { PlanDto } from './contracts';

const MOCK_PLAN: PlanDto = {
  id: 'plan-abc',
  title: 'Barbacoa en el parque',
  description: 'Una tarde estupenda con amigos',
  status: 'proposed',
  ownerFamilyId: 'fam-1',
  createdBy: 'user-me',
  participants: [
    { userId: 'user-me', displayName: 'Yo', status: 'going' },
    { userId: 'user-other', displayName: 'Otro', status: 'maybe' },
  ],
  sharedWithFamilyIds: [],
  createdAt: '2026-05-26T00:00:00Z',
  place: { name: 'Parque del Retiro', address: 'Madrid' },
  scheduledAt: '2026-06-15T12:00:00Z',
};

describe('PlanDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra los detalles del plan', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Barbacoa en el parque')).toBeInTheDocument();
      expect(screen.getByText('Una tarde estupenda con amigos')).toBeInTheDocument();
    });
  });

  it('muestra los botones RSVP', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => {
      // Usamos exact para no colisionar "Voy" con "No voy"
      expect(screen.getByRole('button', { name: 'Voy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Quizá' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No voy' })).toBeInTheDocument();
    });
  });

  it('muestra los participantes con su estado', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Yo')).toBeInTheDocument();
      expect(screen.getByText('Otro')).toBeInTheDocument();
    });
  });

  it('muestra el chat del plan', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/chat del plan/i)).toBeInTheDocument();
    });
  });

  it('muestra el botón de eliminar para el owner', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /eliminar plan/i })).toBeInTheDocument();
    });
  });

  it('pide confirmación antes de eliminar el plan', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    const user = userEvent.setup();
    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => screen.getByRole('button', { name: /eliminar plan/i }));
    await user.click(screen.getByRole('button', { name: /eliminar plan/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  it('navega a /plans tras confirmar la eliminación', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => screen.getByRole('button', { name: /eliminar plan/i }));
    await user.click(screen.getByRole('button', { name: /eliminar plan/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/plans' });
    });
  });
});

// ── Tests: usePlanChat (realtime display_name) ────────────────────────────────
//
// Verifica que los mensajes ajenos recibidos vía Supabase Realtime se muestran
// con el nombre correcto aunque la tabla plan_messages no tenga columna
// display_name. El hook resuelve el nombre desde el mapa de participants.

describe('usePlanChat — mensaje ajeno sin display_name en payload realtime', () => {
  let realtimeCallback: ((payload: unknown) => void) | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    realtimeCallback = undefined;

    // Sobreescribimos el mock de supabase para capturar el callback del INSERT
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase.channel as Mock).mockReturnValue({
      on: vi.fn().mockImplementation(
        (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
          realtimeCallback = cb;
          return { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
        },
      ),
      subscribe: vi.fn().mockReturnThis(),
    });
  });

  it('muestra el nombre del participante al recibir un INSERT ajeno', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    // Esperamos a que cargue el plan y el chat
    await waitFor(() => screen.getByText('Barbacoa en el parque'));
    await waitFor(() => screen.getByText(/chat del plan/i));

    // Simulamos un INSERT de realtime de otro usuario (sin display_name en el payload)
    await act(async () => {
      realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          id: 'msg-realtime-1',
          plan_id: 'plan-abc',
          user_id: 'user-other', // está en MOCK_PLAN.participants con displayName 'Otro'
          body: 'Hola desde realtime',
          created_at: new Date().toISOString(),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Hola desde realtime')).toBeInTheDocument();
      // "Otro" aparece en la burbuja del chat (sender) — usamos getAllByText
      // porque también está en la lista de participantes
      expect(screen.getAllByText('Otro').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('hace invalidate de la query cuando el userId no está en participants', async () => {
    const { api } = await import('@/shared/lib/api');

    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });

    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => screen.getByText('Barbacoa en el parque'));
    await waitFor(() => screen.getByText(/chat del plan/i));

    // Verificamos que api.get vuelve a llamarse con la ruta de mensajes
    // (invalidate dispara un refetch de 'plan-messages').
    const getCallsBefore = vi.mocked(api.get).mock.calls.length;

    await act(async () => {
      realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          id: 'msg-realtime-unknown',
          plan_id: 'plan-abc',
          user_id: 'user-unknown', // NO está en participants → debe hacer invalidate
          body: 'Mensaje de desconocido',
          created_at: new Date().toISOString(),
        },
      });
    });

    // El invalidate dispara un refetch → api.get debe haberse llamado de nuevo
    await waitFor(() => {
      const getCallsAfter = vi.mocked(api.get).mock.calls.length;
      expect(getCallsAfter).toBeGreaterThan(getCallsBefore);
    });
  });

  it('deduplica mensajes propios: el POST y el INSERT de realtime no duplican', async () => {
    const { api } = await import('@/shared/lib/api');
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/messages')) return Promise.resolve([]);
      return Promise.resolve(MOCK_PLAN);
    });
    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'msg-own-1',
      planId: 'plan-abc',
      userId: 'user-me',
      displayName: 'Yo',
      body: 'Mi mensaje',
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderWithQuery(<PlanDetailPage />);

    await waitFor(() => screen.getByText(/chat del plan/i));

    // Enviamos un mensaje propio
    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    await user.type(input, 'Mi mensaje');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => screen.getByText('Mi mensaje'));

    // Simulamos que Realtime también entrega el mismo INSERT (usuario propio)
    await act(async () => {
      realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          id: 'msg-own-1', // mismo id → debe deduplicarse
          plan_id: 'plan-abc',
          user_id: 'user-me',
          body: 'Mi mensaje',
          created_at: new Date().toISOString(),
        },
      });
    });

    // El mensaje solo aparece una vez
    const matches = screen.getAllByText('Mi mensaje');
    expect(matches).toHaveLength(1);
  });
});
