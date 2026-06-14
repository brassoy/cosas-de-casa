/**
 * Índice de vistas de la feature `groups` (peñas).
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const groupsBaseViews: Partial<Record<ScreenId, AnyView>> = {
  groups: lazy(() => import('./base/GroupsView')),
  group_create: lazy(() => import('./base/CreateGroupView')),
  group_join: lazy(() => import('./base/JoinGroupView')),
  group_home: lazy(() => import('./base/GroupHomeView')),
};

export const groupsCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  groups: lazy(() => import('./cozysitcom/GroupsView')),
  group_create: lazy(() => import('./cozysitcom/CreateGroupView')),
  group_join: lazy(() => import('./cozysitcom/JoinGroupView')),
  group_home: lazy(() => import('./cozysitcom/GroupHomeView')),
};

export const groupsSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  groups: lazy(() => import('./springfield/GroupsView')),
  group_create: lazy(() => import('./springfield/CreateGroupView')),
  group_join: lazy(() => import('./springfield/JoinGroupView')),
  group_home: lazy(() => import('./springfield/GroupHomeView')),
};

export const groupsCozyViews: Partial<Record<ScreenId, AnyView>> = {
  groups: lazy(() => import('./cozy/GroupsView')),
  group_create: lazy(() => import('./cozy/CreateGroupView')),
  group_join: lazy(() => import('./cozy/JoinGroupView')),
  group_home: lazy(() => import('./cozy/GroupHomeView')),
};
