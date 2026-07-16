/**
 * Índice de vistas de la feature `routines`.
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por pantalla vía `React.lazy`. Los themes alternativos (cozy,
 * cozysitcom, springfield) caen a `base` por el fallback de ThemeView.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const routinesBaseViews: Partial<Record<ScreenId, AnyView>> = {
  routines: lazy(() => import('./base/RoutinesView')),
  routine_detail: lazy(() => import('./base/RoutineDetailView')),
  routine_items: lazy(() => import('./base/RoutineItemsView')),
  routine_stats: lazy(() => import('./base/RoutineStatsView')),
};
