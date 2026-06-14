/**
 * Índice de vistas de la feature `menu`.
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const menuBaseViews: Partial<Record<ScreenId, AnyView>> = {
  menu: lazy(() => import('./base/MenuView')),
};

export const menuCozyViews: Partial<Record<ScreenId, AnyView>> = {
  menu: lazy(() => import('./cozy/MenuView')),
};

export const menuCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  menu: lazy(() => import('./cozysitcom/MenuView')),
};

export const menuSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  menu: lazy(() => import('./springfield/MenuView')),
};
