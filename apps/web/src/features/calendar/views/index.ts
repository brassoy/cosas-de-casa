/**
 * Vistas presentacionales `base` de la feature `calendar`.
 *
 * Code-split por theme con React.lazy: el bundle de la vista solo se carga cuando
 * el theme `base` monta la pantalla. El registry central (otra fase) consume este
 * mapa para componer `themeRegistry.base`.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const calendarBaseViews: Partial<Record<ScreenId, AnyView>> = {
  calendar: lazy(() => import('./base/CalendarView')),
};

export const calendarCozyViews: Partial<Record<ScreenId, AnyView>> = {
  calendar: lazy(() => import('./cozy/CalendarView')),
};

export const calendarCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  calendar: lazy(() => import('./cozysitcom/CalendarView')),
};

export const calendarSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  calendar: lazy(() => import('./springfield/CalendarView')),
};
