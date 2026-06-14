/**
 * Vistas presentacionales `base` de la feature `stats`.
 *
 * Code-split por theme con React.lazy: el bundle de la vista solo se carga cuando
 * el theme `base` monta la pantalla. El registry central (Fase posterior) consume
 * este mapa para componer `themeRegistry.base`.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const statsBaseViews: Partial<Record<ScreenId, AnyView>> = {
  stats: lazy(() => import('./base/StatsView')),
};

export const statsCozyViews: Partial<Record<ScreenId, AnyView>> = {
  stats: lazy(() => import('./cozy/StatsView')),
};

export const statsCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  stats: lazy(() => import('./cozysitcom/StatsView')),
};

export const statsSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  stats: lazy(() => import('./springfield/StatsView')),
};
