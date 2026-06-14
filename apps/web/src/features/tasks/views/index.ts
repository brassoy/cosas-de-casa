/**
 * Índice de vistas de la feature `tasks`.
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const tasksBaseViews: Partial<Record<ScreenId, AnyView>> = {
  tasks_list: lazy(() => import('./base/TasksListView')),
  tasks_detail: lazy(() => import('./base/TaskDetailView')),
};

export const tasksCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  tasks_list: lazy(() => import('./cozysitcom/TasksListView')),
  tasks_detail: lazy(() => import('./cozysitcom/TaskDetailView')),
};

export const tasksSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  tasks_list: lazy(() => import('./springfield/TasksListView')),
  tasks_detail: lazy(() => import('./springfield/TaskDetailView')),
};

export const tasksCozyViews: Partial<Record<ScreenId, AnyView>> = {
  tasks_list: lazy(() => import('./cozy/TasksListView')),
  tasks_detail: lazy(() => import('./cozy/TaskDetailView')),
};
