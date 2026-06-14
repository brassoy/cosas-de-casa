/**
 * Índice de vistas de la feature `friends` (familias amigas).
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por pantalla vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const friendsBaseViews: Partial<Record<ScreenId, AnyView>> = {
  friends: lazy(() => import('./base/FriendsView')),
  friends_redeem: lazy(() => import('./base/FriendRedeemView')),
};

export const friendsCozyViews: Partial<Record<ScreenId, AnyView>> = {
  friends: lazy(() => import('./cozy/FriendsView')),
  friends_redeem: lazy(() => import('./cozy/FriendRedeemView')),
};

export const friendsCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  friends: lazy(() => import('./cozysitcom/FriendsView')),
  friends_redeem: lazy(() => import('./cozysitcom/FriendRedeemView')),
};

export const friendsSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  friends: lazy(() => import('./springfield/FriendsView')),
  friends_redeem: lazy(() => import('./springfield/FriendRedeemView')),
};
