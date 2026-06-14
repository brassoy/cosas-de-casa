/**
 * Índice de vistas de la feature `plans`.
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const plansBaseViews: Partial<Record<ScreenId, AnyView>> = {
  plans: lazy(() => import('./base/PlansView')),
  plan_create: lazy(() => import('./base/CreatePlanView')),
  plan_detail: lazy(() => import('./base/PlanDetailView')),
};

export const plansCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  plans: lazy(() => import('./cozysitcom/PlansView')),
  plan_create: lazy(() => import('./cozysitcom/CreatePlanView')),
  plan_detail: lazy(() => import('./cozysitcom/PlanDetailView')),
};

export const plansSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  plans: lazy(() => import('./springfield/PlansView')),
  plan_create: lazy(() => import('./springfield/CreatePlanView')),
  plan_detail: lazy(() => import('./springfield/PlanDetailView')),
};

export const plansCozyViews: Partial<Record<ScreenId, AnyView>> = {
  plans: lazy(() => import('./cozy/PlansView')),
  plan_create: lazy(() => import('./cozy/CreatePlanView')),
  plan_detail: lazy(() => import('./cozy/PlanDetailView')),
};
