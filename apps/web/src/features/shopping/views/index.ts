/**
 * Índice de vistas de la feature `shopping`.
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const shoppingBaseViews: Partial<Record<ScreenId, AnyView>> = {
  shopping_lists: lazy(() => import('./base/ShoppingListsView')),
  shopping_list_detail: lazy(() => import('./base/ShoppingListDetailView')),
};

export const shoppingCozyViews: Partial<Record<ScreenId, AnyView>> = {
  shopping_lists: lazy(() => import('./cozy/ShoppingListsView')),
  shopping_list_detail: lazy(() => import('./cozy/ShoppingListDetailView')),
};

export const shoppingCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  shopping_lists: lazy(() => import('./cozysitcom/ShoppingListsView')),
  shopping_list_detail: lazy(() => import('./cozysitcom/ShoppingListDetailView')),
};

export const shoppingSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  shopping_lists: lazy(() => import('./springfield/ShoppingListsView')),
  shopping_list_detail: lazy(() => import('./springfield/ShoppingListDetailView')),
};
