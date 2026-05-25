import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { App } from '../App';

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function IndexPage() {
    return (
      <section>
        <h2>Bienvenido a Cosas de Casa</h2>
        <p>Tu espacio para gestionar todo lo del hogar.</p>
      </section>
    );
  },
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
