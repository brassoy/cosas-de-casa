/**
 * Índice de vistas de la feature `budget` (tickets y gasto).
 *
 * Expone las vistas presentacionales del theme `base` indexadas por `ScreenId`,
 * con code-split por theme vía `React.lazy`. El registry central
 * (`shared/theme/registry.ts`) las compone en otra fase.
 */

import { lazy } from 'react';
import type { AnyView, ScreenId } from '@/shared/theme/registry';

export const budgetBaseViews: Partial<Record<ScreenId, AnyView>> = {
  budget_receipts: lazy(() => import('./base/ReceiptsView')),
  budget_receipt_detail: lazy(() => import('./base/ReceiptDetailView')),
  budget_spend: lazy(() => import('./base/SpendView')),
};

export const budgetCozysitcomViews: Partial<Record<ScreenId, AnyView>> = {
  budget_receipts: lazy(() => import('./cozysitcom/ReceiptsView')),
  budget_receipt_detail: lazy(() => import('./cozysitcom/ReceiptDetailView')),
  budget_spend: lazy(() => import('./cozysitcom/SpendView')),
};

export const budgetCozyViews: Partial<Record<ScreenId, AnyView>> = {
  budget_receipts: lazy(() => import('./cozy/ReceiptsView')),
  budget_receipt_detail: lazy(() => import('./cozy/ReceiptDetailView')),
  budget_spend: lazy(() => import('./cozy/SpendView')),
};

export const budgetSpringfieldViews: Partial<Record<ScreenId, AnyView>> = {
  budget_receipts: lazy(() => import('./springfield/ReceiptsView')),
  budget_receipt_detail: lazy(() => import('./springfield/ReceiptDetailView')),
  budget_spend: lazy(() => import('./springfield/SpendView')),
};
