/* ─── Índice de vistas base — feature auth ──────────────────────────────────
 *
 * Registra las vistas presentacionales del theme `base` para las pantallas de
 * auth. La fase del registry compone estos mapas en `themeRegistry.base`.
 *
 * `auth_login` y `auth_signup` comparten el MISMO componente (`AuthView`), que se
 * comporta según la prop `mode`. Cada entrada usa su propio `lazy()` para que el
 * registry pueda code-split por pantalla; ambos resuelven al mismo módulo.
 * ─────────────────────────────────────────────────────────────────────────── */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const authBaseViews: Partial<Record<ScreenId, AnyView>> = {
  auth_login: lazy(() => import('./base/AuthView')),
  auth_signup: lazy(() => import('./base/AuthView')),
};

// Theme `cozysitcom`: ambas pantallas comparten el mismo componente
// (`cozysitcom/AuthView`), que se comporta según la prop `mode`, igual que la base.
export const authCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  auth_login: lazy(() => import('./cozysitcom/AuthView')),
  auth_signup: lazy(() => import('./cozysitcom/AuthView')),
};

// Theme `springfield`: ambas pantallas comparten el mismo componente
// (`springfield/AuthView`), que se comporta según la prop `mode`, igual que la base.
export const authSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  auth_login: lazy(() => import('./springfield/AuthView')),
  auth_signup: lazy(() => import('./springfield/AuthView')),
};

// Theme `cozy`: ambas pantallas comparten el mismo componente (`cozy/AuthView`),
// que se comporta según la prop `mode`, igual que la base.
export const authCozyViews: Partial<Record<ScreenId, AnyView>> = {
  auth_login: lazy(() => import('./cozy/AuthView')),
  auth_signup: lazy(() => import('./cozy/AuthView')),
};
