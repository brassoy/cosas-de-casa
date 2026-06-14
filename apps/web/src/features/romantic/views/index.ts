import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

/**
 * Vistas presentacionales del theme `base` para la feature `romantic`.
 * El registry central (`shared/theme/registry.ts`) las consume en otra fase.
 */
export const romanticBaseViews: Partial<Record<ScreenId, AnyView>> = {
  romantic: lazy(() => import('./base/RomanticView')),
};

/**
 * Vistas presentacionales del theme `cozysitcom` (retro cálido, sitcom 70s)
 * para la feature `romantic`. Mismo contrato que `romanticBaseViews`.
 */
export const romanticCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  romantic: lazy(() => import('./cozysitcom/RomanticView')),
};

/**
 * Vistas presentacionales del theme `springfield` (cómic: bordes de tinta,
 * hard shadows, pegatinas) para la feature `romantic`. Mismo contrato que
 * `romanticBaseViews`.
 */
export const romanticSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  romantic: lazy(() => import('./springfield/RomanticView')),
};

/**
 * Vistas presentacionales del theme `cozy` (cuaderno de papel: papel pautado,
 * cinta, chinchetas, fuentes manuscritas) para la feature `romantic`. Mismo
 * contrato que `romanticBaseViews`.
 */
export const romanticCozyViews: Partial<Record<ScreenId, AnyView>> = {
  romantic: lazy(() => import('./cozy/RomanticView')),
};
