/**
 * Tests de la feature notifications (Fase 2C).
 *
 * Cubre:
 *  1. Flujo de suscripción — mockea Notification y pushManager
 *  2. Estado "no soportado" cuando falta la API
 *  3. Estado "permiso denegado"
 *  4. Render del toggle en el estado correcto
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('@/features/family/store/family.store', () => ({
  useFamilyStore: (selector: (s: { activeFamily: { id: string; name: string } | null }) => unknown) =>
    selector({ activeFamily: { id: 'family-1', name: 'Mi Familia' } }),
}));

// ── Mock de la API ────────────────────────────────────────────────────────────

const mockApiPost = vi.fn();
vi.mock('@/shared/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  ApiRequestError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly body: { message: string },
    ) {
      super(body.message);
    }
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>);
}

// ── Tipos globales del navegador que vamos a mockear ─────────────────────────

interface MockPushSubscription {
  endpoint: string;
  toJSON: () => { keys: { p256dh: string; auth: string } };
}

const mockSubscription: MockPushSubscription = {
  endpoint: 'https://push.example.com/sub/123',
  toJSON: () => ({ keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
};

// ── Importaciones bajo test ───────────────────────────────────────────────────
//
// El subcomponente presentacional `NotificationToggle` se eliminó al migrar a las
// 4 themes; en producción la pantalla vive inline en `family/views/<theme>/`, y el
// `FamilyHomePage` cablea la lógica real con `useNotificationsStore` +
// `useSubscribeToPush`. Para NO perder cobertura de esa lógica real (permiso,
// pushManager.subscribe, conversión VAPID y POST a la API), montamos aquí un
// harness mínimo que reproduce EXACTAMENTE ese cableado de producción.

import { useNotificationsStore } from './store/notifications.store';
import { useSubscribeToPush } from './hooks/useNotifications';

// Espejo del cableado de FamilyHomePage: store + mutación reales. La UI es la
// superficie mínima sobre la que disparar y observar la lógica.
function NotificationToggle() {
  const { permissionStatus, isSubscribed, isLoading } = useNotificationsStore();
  const subscribe = useSubscribeToPush();

  const isActive = permissionStatus === 'granted' && isSubscribed;
  const disabled =
    permissionStatus === 'unsupported' || permissionStatus === 'denied';
  const showSpinner = isLoading || subscribe.isPending;

  // Texto de estado (en el <p>): espeja el copy del componente original.
  const statusLabel =
    permissionStatus === 'unsupported'
      ? 'Notificaciones no disponibles'
      : permissionStatus === 'denied'
        ? 'Notificaciones bloqueadas'
        : 'Activar notificaciones';

  // Etiqueta de la acción (en el <button>): distinta del <p> para no colisionar
  // con las queries getByText del estado.
  const actionLabel =
    permissionStatus === 'unsupported'
      ? 'No disponible'
      : permissionStatus === 'denied'
        ? 'Ver ajustes'
        : 'Activar';

  function handleClick() {
    if (disabled || isActive) return;
    subscribe.mutate();
  }

  if (isActive) {
    return <span aria-live="polite">✓ Activas</span>;
  }

  return (
    <div>
      <p>{subscribe.error ? subscribe.error.message : statusLabel}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || showSpinner}
        aria-label={actionLabel}
      >
        {showSpinner ? 'Activando...' : actionLabel}
      </button>
    </div>
  );
}

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Mock global: Notification — debe montarse ANTES de resetear el store
  // para que getInitialPermissionStatus() pueda leer el valor correcto.
  Object.defineProperty(window, 'Notification', {
    writable: true,
    configurable: true,
    value: {
      permission: 'default' as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
  });

  // Reset del store de Zustand entre tests — después de fijar Notification.
  useNotificationsStore.setState({
    permissionStatus: 'default',
    isSubscribed: false,
    isLoading: false,
  });

  // Mock global: serviceWorker.ready
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: {
      ready: Promise.resolve(mockServiceWorkerRegistration),
    },
  });

  // Mock VITE_VAPID_PUBLIC_KEY
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BFpN49UqqWWLKZPkTQW2q7ht1xwAnSjwTwVaLqXEaJjyljhcXeBkOUsJXV7yxDXah9r0Bqkf9Ed0gO2gDgoY2ug');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Estado inicial del toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationToggle — estado inicial', () => {
  it('renderiza el botón "Activar" cuando el permiso es "default"', () => {
    useNotificationsStore.setState({ permissionStatus: 'default' });
    wrap(<NotificationToggle />);
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument();
  });

  it('muestra "Notificaciones bloqueadas" cuando el permiso es "denied"', () => {
    useNotificationsStore.setState({ permissionStatus: 'denied' });
    wrap(<NotificationToggle />);
    expect(screen.getByText(/notificaciones bloqueadas/i)).toBeInTheDocument();
  });

  it('el botón está deshabilitado cuando el permiso es "denied"', () => {
    useNotificationsStore.setState({ permissionStatus: 'denied' });
    wrap(<NotificationToggle />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('muestra "Notificaciones no disponibles" cuando es "unsupported"', () => {
    useNotificationsStore.setState({ permissionStatus: 'unsupported' });
    wrap(<NotificationToggle />);
    expect(screen.getByText(/no disponibles/i)).toBeInTheDocument();
  });

  it('muestra el badge "Activas" cuando permiso=granted e isSubscribed=true', () => {
    useNotificationsStore.setState({ permissionStatus: 'granted', isSubscribed: true });
    wrap(<NotificationToggle />);
    expect(screen.getByText(/activas/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activar/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Flujo de suscripción — camino feliz
// ─────────────────────────────────────────────────────────────────────────────

describe('Flujo de suscripción — camino feliz', () => {
  it('llama a requestPermission y subscribe al pulsar "Activar"', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: mockSubscription.endpoint,
      createdAt: new Date().toISOString(),
    });

    wrap(<NotificationToggle />);
    await user.click(screen.getByRole('button', { name: /activar/i }));

    await waitFor(() => {
      expect(
        (window.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> })
          .requestPermission,
      ).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        // applicationServerKey es ArrayBuffer (Uint8Array.buffer) tras la conversión VAPID.
        applicationServerKey: expect.any(ArrayBuffer),
      });
    });

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/families/family-1/notifications/subscribe',
        expect.objectContaining({
          endpoint: mockSubscription.endpoint,
          keys: expect.objectContaining({ p256dh: 'p256dh-key', auth: 'auth-key' }),
        }),
      );
    });
  });

  it('muestra el badge "Activas" tras una suscripción exitosa', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: mockSubscription.endpoint,
      createdAt: new Date().toISOString(),
    });

    wrap(<NotificationToggle />);
    await user.click(screen.getByRole('button', { name: /activar/i }));

    await waitFor(() => {
      expect(screen.getByText(/activas/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Flujo de suscripción — permiso denegado
// ─────────────────────────────────────────────────────────────────────────────

describe('Flujo de suscripción — permiso denegado', () => {
  it('muestra el mensaje de error cuando el usuario deniega el permiso', async () => {
    const user = userEvent.setup();

    // Simular que el usuario pulsa "Bloquear" en el diálogo del navegador.
    (
      window.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> }
    ).requestPermission = vi.fn().mockResolvedValue('denied');

    wrap(<NotificationToggle />);
    await user.click(screen.getByRole('button', { name: /activar/i }));

    await waitFor(() => {
      expect(screen.getByText(/denegado|bloqueado|configuración/i)).toBeInTheDocument();
    });

    // No debe llamar a la API
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reutilización de suscripción existente
// ─────────────────────────────────────────────────────────────────────────────

describe('Flujo de suscripción — suscripción preexistente', () => {
  it('no llama a subscribe() si ya existe una suscripción activa', async () => {
    const user = userEvent.setup();

    // Simular que ya hay una suscripción activa.
    mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
    mockApiPost.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: mockSubscription.endpoint,
      createdAt: new Date().toISOString(),
    });

    wrap(<NotificationToggle />);
    await user.click(screen.getByRole('button', { name: /activar/i }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled();
    });

    // subscribe() no debe llamarse porque ya existe
    expect(mockPushManager.subscribe).not.toHaveBeenCalled();
  });
});
