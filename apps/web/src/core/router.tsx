import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import { App } from '../App';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SignupPage } from '@/features/auth/pages/SignupPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { LandingPage } from '@/features/landing/LandingPage';
import { CreateFamilyPage } from '@/features/family/pages/CreateFamilyPage';
import { JoinFamilyPage } from '@/features/family/pages/JoinFamilyPage';
import { FamilyHomePage } from '@/features/family/pages/FamilyHomePage';
import { FamilyManagePage } from '@/features/family/pages/FamilyManagePage';
import { OnboardingPage } from '@/features/family/pages/OnboardingPage';
import { ListsPage } from '@/features/shopping/pages/ListsPage';
import { ListDetailPage } from '@/features/shopping/pages/ListDetailPage';
import { TasksPage } from '@/features/tasks/pages/TasksPage';
import { TaskDetailPage } from '@/features/tasks/pages/TaskDetailPage';
import { FridgePage } from '@/features/fridge/pages/FridgePage';
import { StatsPage } from '@/features/stats/pages/StatsPage';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { RoutinesPage } from '@/features/routines/pages/RoutinesPage';
import { RoutineDetailPage } from '@/features/routines/pages/RoutineDetailPage';
import { RoutineItemsPage } from '@/features/routines/pages/RoutineItemsPage';
import { RoutineStatsPage } from '@/features/routines/pages/RoutineStatsPage';
import { RomanticPage } from '@/features/romantic/pages/RomanticPage';
import { GroupsPage } from '@/features/groups/pages/GroupsPage';
import { CreateGroupPage } from '@/features/groups/pages/CreateGroupPage';
import { JoinGroupPage } from '@/features/groups/pages/JoinGroupPage';
import { GroupHomePage } from '@/features/groups/pages/GroupHomePage';
import { GroupSettingsPage } from '@/features/groups/pages/GroupSettingsPage';
import { FriendsPage } from '@/features/friends/pages/FriendsPage';
import { RedeemFriendPage } from '@/features/friends/pages/RedeemFriendPage';
import { PlansPage } from '@/features/plans/pages/PlansPage';
import { CreatePlanPage } from '@/features/plans/pages/CreatePlanPage';
import { PlanDetailPage } from '@/features/plans/pages/PlanDetailPage';
import { ReceiptsPage } from '@/features/budget/pages/ReceiptsPage';
import { ReceiptDetailPage } from '@/features/budget/pages/ReceiptDetailPage';
import { SpendPage } from '@/features/budget/pages/SpendPage';
import { MenuPage } from '@/features/menu/pages/MenuPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { api } from '@/shared/lib/api';
import type { FamilyDto } from '@cosasdecasa/contracts';

// ── Root ─────────────────────────────────────────────────────────────────────

const centeredScreenStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60dvh',
  gap: '1rem',
  padding: '2rem',
  textAlign: 'center',
};

/**
 * Heurística para saber si un error es de sesión/autenticación (401 / token
 * caducado). El cliente API lanza `Error` con el status en el mensaje; Supabase
 * y otros pueden traer `status`. Distinguimos para no decir SIEMPRE "sesión
 * caducada" ante cualquier fallo (ese era el bug original).
 */
function isSessionError(error: unknown): boolean {
  if (!error) return false;
  // Errores con `status` numérico (fetch wrapper, Supabase, HttpError…).
  const status = (error as { status?: unknown }).status;
  if (status === 401 || status === 403) return true;
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /\b(401|403)\b|no autorizado|unauthorized|sesi[oó]n|token|jwt/i.test(message);
}

/**
 * Pantalla de error de ruta: evita el crash pelado y ofrece recuperación.
 * Distingue el error de sesión/401 (mensaje de re-login) del resto (mensaje
 * genérico + reintentar). `reset` lo aporta TanStack Router para reintentar el
 * render del límite de error sin recargar la página.
 */
function RouteErrorScreen({ error, reset }: { error: unknown; reset: () => void }) {
  if (isSessionError(error)) {
    return (
      <div style={centeredScreenStyle}>
        <h2 style={{ color: 'var(--color-text)' }}>Tu sesión ha caducado</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Por seguridad, vuelve a iniciar sesión para continuar.
        </p>
        <a href="/login" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
          Ir a iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div style={centeredScreenStyle}>
      <h2 style={{ color: 'var(--color-text)' }}>Algo ha ido mal</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Ha ocurrido un error inesperado. Puedes reintentar o volver al inicio.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            color: 'var(--color-accent)',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          Reintentar
        </button>
        <a href="/" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

/**
 * Pantalla 404: ruta inexistente (comodín del router). Ofrece volver al inicio
 * en vez de dejar al usuario en una página en blanco.
 */
function NotFoundScreen() {
  return (
    <div style={centeredScreenStyle}>
      <h2 style={{ color: 'var(--color-text)' }}>Página no encontrada</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        La página que buscas no existe o se ha movido.
      </p>
      <a href="/" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
        Volver al inicio
      </a>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: App,
  errorComponent: RouteErrorScreen,
  notFoundComponent: NotFoundScreen,
});

// ── Rutas públicas ────────────────────────────────────────────────────────────

// Landing de marketing: pública, sin guard ni sesión. Es una página full-screen
// propia (overlay sobre el shell, fuerza la estética "Hommer"). No redirige a `/`
// aunque haya sesión: es la portada y debe poder verse siempre.
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing',
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: async () => {
    await useAuthStore.getState().ready;
    const { session } = useAuthStore.getState();
    if (session) throw redirect({ to: '/' });
  },
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
  beforeLoad: async () => {
    await useAuthStore.getState().ready;
    const { session } = useAuthStore.getState();
    if (session) throw redirect({ to: '/' });
  },
});

// Callback del enlace de recuperación de contraseña (correo de Supabase).
// Pública y SIN guard: el usuario llega con una sesión de RECUPERACIÓN (no es la
// sesión normal); no debe redirigirse a `/` como hacen login/signup, porque
// aquí el objetivo es fijar la nueva contraseña antes de continuar. No requiere
// familia.
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
});

// ── Guard de autenticación ────────────────────────────────────────────────────

async function requireAuth() {
  // Esperamos a conocer el estado inicial de sesión antes de decidir.
  await useAuthStore.getState().ready;
  const { session } = useAuthStore.getState();
  if (!session) {
    throw redirect({ to: '/login' });
  }
}

/**
 * Guard de las rutas con `:familyId`. Además de exigir sesión, SINCRONIZA la
 * familia activa desde la URL: la fuente de verdad es el `familyId` del path,
 * no el store persistido. Sin esto, abrir una URL de familia directamente
 * (deep-link, recarga, incógnito, store vacío) mostraba "No hay ninguna familia
 * activa" porque la página leía el store en vez de la URL.
 */
async function requireFamily({ params }: { params: Record<string, string> }) {
  await useAuthStore.getState().ready;
  const { session } = useAuthStore.getState();
  if (!session) {
    throw redirect({ to: '/login' });
  }

  const familyId = params.familyId;
  if (!familyId) return;

  const { activeFamily, setActiveFamily } = useFamilyStore.getState();
  if (activeFamily?.id === familyId) return;

  // El store no coincide con la URL → resolvemos la familia desde la API.
  let families: FamilyDto[];
  try {
    families = await api.get<FamilyDto[]>('/families');
  } catch {
    // Error de red: no bloqueamos; la página mostrará su estado de carga/error.
    return;
  }
  const match = families.find((f) => f.id === familyId);
  if (match) {
    setActiveFamily({ id: match.id, name: match.name });
  } else {
    // El usuario no pertenece a esa familia → al inicio (que resuelve la suya).
    throw redirect({ to: '/' });
  }
}

// ── Ruta raíz autenticada ─────────────────────────────────────────────────────
// Comprueba si el usuario ya tiene familia; si no → onboarding.

/**
 * Pantalla del índice `/`. Sin sesión es la PORTADA pública (landing). Con sesión
 * pero sin familia, onboarding. (Con familia, el loader ya redirige a
 * `/family/:id` antes de renderizar este componente.)
 */
function IndexScreen() {
  const session = useAuthStore((s) => s.session);
  return session ? <OnboardingPage /> : <LandingPage />;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // No exige sesión: un visitante en `/` ve la landing (portada pública); con
  // sesión, el loader resuelve la familia y entra a la app. La landing sigue
  // siendo accesible siempre en `/landing` (también con sesión).
  beforeLoad: async () => {
    await useAuthStore.getState().ready;
  },
  loader: async () => {
    const { session } = useAuthStore.getState();
    if (!session) return; // visitante → la landing la pinta el componente

    const { activeFamily, setActiveFamily } = useFamilyStore.getState();

    // Resolvemos la familia: la activa del store o, si no hay, la primera del usuario.
    let familyId = activeFamily?.id ?? null;
    if (!familyId) {
      try {
        const families = await api.get<FamilyDto[]>('/families');
        const first = families[0];
        if (first) {
          setActiveFamily({ id: first.id, name: first.name });
          familyId = first.id;
        }
      } catch {
        // Si la API falla, dejamos al usuario en onboarding.
      }
    }

    // El redirect DEBE lanzarse en el loader: TanStack Router lo trata como
    // navegación. Lanzarlo dentro del componente lo captura el error boundary,
    // que era el bug que rompía el login de los usuarios que YA tenían familia.
    if (familyId) {
      throw redirect({ to: '/family/$familyId', params: { familyId } });
    }
  },
  // Con sesión sin familia → onboarding. Sin sesión → landing (portada pública).
  component: IndexScreen,
});

// ── Onboarding ────────────────────────────────────────────────────────────────

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: requireAuth,
  component: OnboardingPage,
});

// ── Family routes ─────────────────────────────────────────────────────────────

const familyCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/create',
  beforeLoad: requireAuth,
  component: CreateFamilyPage,
});

const familyJoinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/join',
  beforeLoad: requireAuth,
  component: JoinFamilyPage,
});

const familyHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId',
  beforeLoad: requireFamily,
  component: FamilyHomePage,
});

// Gestionar familia: pantalla propia (solo OWNER), antes embebida en la home.
const familyManageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/manage',
  beforeLoad: requireFamily,
  component: FamilyManagePage,
});

// ── Shopping routes ───────────────────────────────────────────────────────────

const shoppingListsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/lists',
  beforeLoad: requireFamily,
  component: ListsPage,
});

const shoppingListDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/lists/$listId',
  beforeLoad: requireFamily,
  component: ListDetailPage,
});

// ── Tasks routes ──────────────────────────────────────────────────────────────

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/tasks',
  beforeLoad: requireFamily,
  component: TasksPage,
});

const taskDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/$taskId',
  beforeLoad: requireAuth,
  component: TaskDetailPage,
});

// ── Fridge routes ─────────────────────────────────────────────────────────────

const fridgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/fridge',
  beforeLoad: requireFamily,
  component: FridgePage,
});

// ── Stats route ───────────────────────────────────────────────────────────────

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/stats',
  beforeLoad: requireFamily,
  component: StatsPage,
});

// ── Calendar route ────────────────────────────────────────────────────────────

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/calendar',
  beforeLoad: requireFamily,
  component: CalendarPage,
});

// ── Routines routes ───────────────────────────────────────────────────────────
// Las rutas estáticas (items, stats) van antes que `$routineId`; TanStack
// prioriza los segmentos estáticos así que el orden es solo documental.

const routinesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/routines',
  beforeLoad: requireFamily,
  component: RoutinesPage,
});

const routineItemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/routines/items',
  beforeLoad: requireFamily,
  component: RoutineItemsPage,
});

const routineStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/routines/stats',
  beforeLoad: requireFamily,
  component: RoutineStatsPage,
});

const routineDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/routines/$routineId',
  beforeLoad: requireFamily,
  component: RoutineDetailPage,
});

// ── Romantic route ────────────────────────────────────────────────────────────

const romanticRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/romantic',
  beforeLoad: requireFamily,
  component: RomanticPage,
});

// ── Groups routes ─────────────────────────────────────────────────────────────

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups',
  beforeLoad: requireAuth,
  component: GroupsPage,
});

const groupCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/create',
  beforeLoad: requireAuth,
  component: CreateGroupPage,
});

const groupJoinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/join',
  beforeLoad: requireAuth,
  component: JoinGroupPage,
});

const groupHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$groupId',
  beforeLoad: requireAuth,
  component: GroupHomePage,
});

// Ajustes de la peña: pantalla propia (editar/borrar solo OWNER, salir todos),
// antes embebida en la home de la peña.
const groupSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$groupId/settings',
  beforeLoad: requireAuth,
  component: GroupSettingsPage,
});

// ── Friends routes ────────────────────────────────────────────────────────────

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  beforeLoad: requireAuth,
  component: FriendsPage,
});

const friendsRedeemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends/redeem',
  beforeLoad: requireAuth,
  component: RedeemFriendPage,
});

// ── Plans routes ──────────────────────────────────────────────────────────────

const plansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans',
  beforeLoad: requireAuth,
  component: PlansPage,
});

const planCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans/create',
  beforeLoad: requireAuth,
  component: CreatePlanPage,
});

const planDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans/$planId',
  beforeLoad: requireAuth,
  component: PlanDetailPage,
});

// ── Budget routes ─────────────────────────────────────────────────────────────

const budgetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/budget',
  beforeLoad: requireFamily,
  component: ReceiptsPage,
});

const budgetReceiptDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/budget/receipts/$receiptId',
  beforeLoad: requireFamily,
  component: ReceiptDetailPage,
});

const budgetSpendRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/budget/spend',
  beforeLoad: requireFamily,
  component: SpendPage,
});

// ── Menu route ────────────────────────────────────────────────────────────────

const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/menu',
  beforeLoad: requireFamily,
  component: MenuPage,
});

// ── Settings route ────────────────────────────────────────────────────────────
// Ajustes del usuario: no depende de `familyId`, solo de sesión.

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: SettingsPage,
});

// ── Route tree ────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  signupRoute,
  resetPasswordRoute,
  indexRoute,
  onboardingRoute,
  familyCreateRoute,
  familyJoinRoute,
  familyHomeRoute,
  familyManageRoute,
  shoppingListsRoute,
  shoppingListDetailRoute,
  tasksRoute,
  taskDetailRoute,
  fridgeRoute,
  statsRoute,
  calendarRoute,
  routinesRoute,
  routineItemsRoute,
  routineStatsRoute,
  routineDetailRoute,
  romanticRoute,
  groupsRoute,
  groupCreateRoute,
  groupJoinRoute,
  groupHomeRoute,
  groupSettingsRoute,
  friendsRoute,
  friendsRedeemRoute,
  plansRoute,
  planCreateRoute,
  planDetailRoute,
  budgetRoute,
  budgetReceiptDetailRoute,
  budgetSpendRoute,
  menuRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
