/* ─── Theme Registry — Cosas de Casa ────────────────────────────────────────
 *
 * Mapa central theme → screenId → componente de vista presentacional.
 *
 * Cada pantalla tiene UN container (la page actual de la feature) que cablea la
 * lógica real una sola vez, y N vistas presentacionales (una por theme) elegidas
 * por este registry. `ThemeView` resuelve themeRegistry[theme][screen] con
 * fallback a themeRegistry.base[screen]: esto permite entregar themes pantalla a
 * pantalla sin romper la app (las que aún no estén convertidas caen a base).
 *
 * El mapa `base` se compone aquí haciendo spread de los parciales que cada
 * feature expone en `features/<f>/views` (tanda 1: auth, menu, stats, romantic).
 * Cada parcial usa `React.lazy` para code-split por pantalla. Los mapas de los
 * themes alternativos (cozy, cozysitcom, springfield) siguen VACÍOS: se irán
 * poblando en la Fase 3 y, mientras tanto, `ThemeView` cae a `base` por fallback.
 * ─────────────────────────────────────────────────────────────────────────── */

import type { ComponentType } from 'react';
import type { ThemeName } from './theme-bootstrap';
import { authBaseViews, authCozyViews, authCozysitcomViews, authSpringfieldViews } from '@/features/auth/views';
import { menuBaseViews, menuCozyViews, menuCozysitcomViews, menuSpringfieldViews } from '@/features/menu/views';
import { statsBaseViews, statsCozyViews, statsCozysitcomViews, statsSpringfieldViews } from '@/features/stats/views';
import { romanticBaseViews, romanticCozyViews, romanticCozysitcomViews, romanticSpringfieldViews } from '@/features/romantic/views';
import { familyBaseViews, familyCozyViews, familyCozysitcomViews, familySpringfieldViews } from '@/features/family/views';
import { fridgeBaseViews, fridgeCozyViews, fridgeCozysitcomViews, fridgeSpringfieldViews } from '@/features/fridge/views';
import { plansBaseViews, plansCozyViews, plansCozysitcomViews, plansSpringfieldViews } from '@/features/plans/views';
import { groupsBaseViews, groupsCozyViews, groupsCozysitcomViews, groupsSpringfieldViews } from '@/features/groups/views';
import { friendsBaseViews, friendsCozyViews, friendsCozysitcomViews, friendsSpringfieldViews } from '@/features/friends/views';
import { shoppingBaseViews, shoppingCozyViews, shoppingCozysitcomViews, shoppingSpringfieldViews } from '@/features/shopping/views';
import { tasksBaseViews, tasksCozyViews, tasksCozysitcomViews, tasksSpringfieldViews } from '@/features/tasks/views';
import { calendarBaseViews, calendarCozyViews, calendarCozysitcomViews, calendarSpringfieldViews } from '@/features/calendar/views';
import { budgetBaseViews, budgetCozyViews, budgetCozysitcomViews, budgetSpringfieldViews } from '@/features/budget/views';
import { settingsBaseViews, settingsCozyViews, settingsCozysitcomViews, settingsSpringfieldViews } from '@/features/settings/views';
import { routinesBaseViews } from '@/features/routines/views';

/** Identificadores de las 27 pantallas de la app (ver plan §2.2). */
export type ScreenId =
  | 'auth_login'
  | 'auth_signup'
  | 'onboarding'
  | 'family_create'
  | 'family_join'
  | 'family_home'
  | 'family_manage'
  | 'shopping_lists'
  | 'shopping_list_detail'
  | 'tasks_list'
  | 'tasks_detail'
  | 'fridge_list'
  | 'calendar'
  | 'menu'
  | 'romantic'
  | 'stats'
  | 'budget_receipts'
  | 'budget_receipt_detail'
  | 'budget_spend'
  | 'plans'
  | 'plan_create'
  | 'plan_detail'
  | 'groups'
  | 'group_create'
  | 'group_join'
  | 'group_home'
  | 'group_settings'
  | 'friends'
  | 'friends_redeem'
  | 'settings'
  | 'routines'
  | 'routine_detail'
  | 'routine_items'
  | 'routine_stats';

// Las vistas reciben props específicas de cada pantalla (contratos por feature).
// `any` aquí es intencional: el registry es agnóstico al contrato concreto; el
// tipado fuerte vive en cada `views/types.ts` y en el componente que llama a
// ThemeView con sus props tipadas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyView = ComponentType<any>;

export const themeRegistry: Record<ThemeName, Partial<Record<ScreenId, AnyView>>> = {
  base: {
    ...authBaseViews,
    ...menuBaseViews,
    ...statsBaseViews,
    ...romanticBaseViews,
    ...familyBaseViews,
    ...fridgeBaseViews,
    ...plansBaseViews,
    ...groupsBaseViews,
    ...friendsBaseViews,
    ...shoppingBaseViews,
    ...tasksBaseViews,
    ...calendarBaseViews,
    ...budgetBaseViews,
    ...settingsBaseViews,
    ...routinesBaseViews,
  },
  cozy: {
    ...authCozyViews,
    ...menuCozyViews,
    ...statsCozyViews,
    ...romanticCozyViews,
    ...familyCozyViews,
    ...fridgeCozyViews,
    ...plansCozyViews,
    ...groupsCozyViews,
    ...friendsCozyViews,
    ...shoppingCozyViews,
    ...tasksCozyViews,
    ...calendarCozyViews,
    ...budgetCozyViews,
    ...settingsCozyViews,
  },
  cozysitcom: {
    ...authCozysitcomViews,
    ...menuCozysitcomViews,
    ...statsCozysitcomViews,
    ...romanticCozysitcomViews,
    ...familyCozysitcomViews,
    ...fridgeCozysitcomViews,
    ...plansCozysitcomViews,
    ...groupsCozysitcomViews,
    ...friendsCozysitcomViews,
    ...shoppingCozysitcomViews,
    ...tasksCozysitcomViews,
    ...calendarCozysitcomViews,
    ...budgetCozysitcomViews,
    ...settingsCozysitcomViews,
  },
  springfield: {
    ...authSpringfieldViews,
    ...menuSpringfieldViews,
    ...statsSpringfieldViews,
    ...romanticSpringfieldViews,
    ...familySpringfieldViews,
    ...fridgeSpringfieldViews,
    ...plansSpringfieldViews,
    ...groupsSpringfieldViews,
    ...friendsSpringfieldViews,
    ...shoppingSpringfieldViews,
    ...tasksSpringfieldViews,
    ...calendarSpringfieldViews,
    ...budgetSpringfieldViews,
    ...settingsSpringfieldViews,
  },
};
