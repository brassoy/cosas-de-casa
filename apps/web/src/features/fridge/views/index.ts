/**
 * Vistas presentacionales `base` de la feature `fridge`.
 *
 * Code-split por theme con React.lazy: el bundle de la vista solo se carga cuando
 * el theme `base` monta la pantalla. El registry central (otra fase) consume este
 * mapa para componer `themeRegistry.base`.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const fridgeBaseViews: Partial<Record<ScreenId, AnyView>> = {
  fridge_list: lazy(() => import('./base/FridgeListView')),
};

export const fridgeCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  fridge_list: lazy(() => import('./cozysitcom/FridgeListView')),
};

export const fridgeCozyViews: Partial<Record<ScreenId, AnyView>> = {
  fridge_list: lazy(() => import('./cozy/FridgeListView')),
};

export const fridgeSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  fridge_list: lazy(() => import('./springfield/FridgeListView')),
};
