/**
 * Vistas presentacionales de la feature `settings` (una por theme).
 *
 * Code-split por theme con React.lazy: el bundle de cada vista solo se carga
 * cuando el theme correspondiente monta la pantalla. El registry central
 * (`shared/theme/registry.ts`) consume estos mapas para componer cada theme.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const settingsBaseViews: Partial<Record<ScreenId, AnyView>> = {
  settings: lazy(() => import('./base/SettingsView')),
};

export const settingsCozyViews: Partial<Record<ScreenId, AnyView>> = {
  settings: lazy(() => import('./cozy/SettingsView')),
};

export const settingsCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  settings: lazy(() => import('./cozysitcom/SettingsView')),
};

export const settingsSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  settings: lazy(() => import('./springfield/SettingsView')),
};
