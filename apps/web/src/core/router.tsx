import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import { App } from '../App';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SignupPage } from '@/features/auth/pages/SignupPage';
import { CreateFamilyPage } from '@/features/family/pages/CreateFamilyPage';
import { JoinFamilyPage } from '@/features/family/pages/JoinFamilyPage';
import { FamilyHomePage } from '@/features/family/pages/FamilyHomePage';
import { OnboardingPage } from '@/features/family/pages/OnboardingPage';
import { ListsPage } from '@/features/shopping/pages/ListsPage';
import { ListDetailPage } from '@/features/shopping/pages/ListDetailPage';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { api } from '@/shared/lib/api';
import type { FamilyDto } from '@cosasdecasa/contracts';

// ── Root ─────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: App,
});

// ── Rutas públicas ────────────────────────────────────────────────────────────

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

// ── Guard de autenticación ────────────────────────────────────────────────────

async function requireAuth() {
  // Esperamos a conocer el estado inicial de sesión antes de decidir.
  await useAuthStore.getState().ready;
  const { session } = useAuthStore.getState();
  if (!session) {
    throw redirect({ to: '/login' });
  }
}

// ── Ruta raíz autenticada ─────────────────────────────────────────────────────
// Comprueba si el usuario ya tiene familia; si no → onboarding.

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireAuth,
  loader: async () => {
    const { activeFamily, setActiveFamily } = useFamilyStore.getState();
    if (activeFamily) return { redirectTo: `/family/${activeFamily.id}` };

    try {
      const families = await api.get<FamilyDto[]>('/families');
      const first = families[0];
      if (first) {
        setActiveFamily({ id: first.id, name: first.name });
        return { redirectTo: `/family/${first.id}` };
      }
    } catch {
      // Si la API falla dejamos al usuario en onboarding
    }
    return { redirectTo: null };
  },
  component: function IndexRedirect() {
    // El loader resuelve antes de renderizar; si hay redirección la lanzamos aquí.
    // TanStack Router v1 no ejecuta redirect() dentro de loader sin beforeLoad;
    // usamos component para evaluar el resultado.
    const { activeFamily } = useFamilyStore.getState();
    if (activeFamily) {
      throw redirect({ to: '/family/$familyId', params: { familyId: activeFamily.id } });
    }
    return <OnboardingPage />;
  },
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
  beforeLoad: requireAuth,
  component: FamilyHomePage,
});

// ── Shopping routes ───────────────────────────────────────────────────────────

const shoppingListsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/lists',
  beforeLoad: requireAuth,
  component: ListsPage,
});

const shoppingListDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family/$familyId/lists/$listId',
  beforeLoad: requireAuth,
  component: ListDetailPage,
});

// ── Route tree ────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  signupRoute,
  indexRoute,
  onboardingRoute,
  familyCreateRoute,
  familyJoinRoute,
  familyHomeRoute,
  shoppingListsRoute,
  shoppingListDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
