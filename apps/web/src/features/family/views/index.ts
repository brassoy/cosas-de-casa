/**
 * Índice de vistas de la feature `family`.
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const familyBaseViews: Partial<Record<ScreenId, AnyView>> = {
  onboarding: lazy(() => import('./base/OnboardingView')),
  family_create: lazy(() => import('./base/CreateFamilyView')),
  family_join: lazy(() => import('./base/JoinFamilyView')),
  family_home: lazy(() => import('./base/FamilyHomeView')),
  family_manage: lazy(() => import('./base/FamilyManageView')),
};

export const familyCozyViews: Partial<Record<ScreenId, AnyView>> = {
  onboarding: lazy(() => import('./cozy/OnboardingView')),
  family_create: lazy(() => import('./cozy/CreateFamilyView')),
  family_join: lazy(() => import('./cozy/JoinFamilyView')),
  family_home: lazy(() => import('./cozy/FamilyHomeView')),
  family_manage: lazy(() => import('./cozy/FamilyManageView')),
};

export const familyCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  onboarding: lazy(() => import('./cozysitcom/OnboardingView')),
  family_create: lazy(() => import('./cozysitcom/CreateFamilyView')),
  family_join: lazy(() => import('./cozysitcom/JoinFamilyView')),
  family_home: lazy(() => import('./cozysitcom/FamilyHomeView')),
  family_manage: lazy(() => import('./cozysitcom/FamilyManageView')),
};

export const familySpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  onboarding: lazy(() => import('./springfield/OnboardingView')),
  family_create: lazy(() => import('./springfield/CreateFamilyView')),
  family_join: lazy(() => import('./springfield/JoinFamilyView')),
  family_home: lazy(() => import('./springfield/FamilyHomeView')),
  family_manage: lazy(() => import('./springfield/FamilyManageView')),
};
