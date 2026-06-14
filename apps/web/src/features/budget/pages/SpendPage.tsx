/**
 * SpendPage — CONTAINER del resumen de gasto familiar.
 *
 * Cablea la lógica real UNA sola vez y delega el render en `ThemeView`.
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useSpendSummary` (query) por la familia de la ruta.
 *  - Navegación de vuelta a la lista de tickets.
 *
 * Los estados loading/error los pinta la vista vía `ScreenState`; mientras carga
 * se pasa un resumen vacío como placeholder (la vista no lo muestra porque
 * `isLoading` tiene prioridad en `ScreenState`).
 */

import { useNavigate, useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useSpendSummary } from '../hooks/useBudget';
import type { SpendSummaryDto } from '../contracts';
import type { SpendViewProps } from '../views/types';

const EMPTY_SUMMARY: SpendSummaryDto = {
  total: 0,
  currency: 'EUR',
  byCategory: [],
  byMonth: [],
};

export function SpendPage() {
  const navigate = useNavigate();
  const { familyId } = useParams({ strict: false }) as { familyId: string };

  const { data: summary, isLoading, error } = useSpendSummary(familyId);

  const props: SpendViewProps = {
    summary: summary ?? EMPTY_SUMMARY,
    isLoading,
    error: error ? 'No se ha podido cargar el resumen de gasto.' : null,
    onBack: () =>
      void navigate({ to: '/family/$familyId/budget', params: { familyId } }),
  };

  return <ThemeView screen="budget_spend" props={props} />;
}
