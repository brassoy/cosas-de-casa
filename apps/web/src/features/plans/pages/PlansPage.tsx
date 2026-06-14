/**
 * PlansPage — CONTAINER del listado de planes.
 *
 * Cablea la lógica real (familia activa + listado de planes) una sola vez y
 * delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo.
 */

import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyPlans } from '../hooks/usePlans';
import type { PlansViewProps } from '../views/types';

export function PlansPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const { data: plans, isLoading, error } = useFamilyPlans(activeFamily?.id);

  if (!activeFamily) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  const viewProps: PlansViewProps = {
    plans: plans ?? [],
    isLoading,
    error: error ? 'No se han podido cargar los planes. Inténtalo de nuevo.' : null,
    onCreate: () => void navigate({ to: '/plans/create' }),
    onOpen: (id) => void navigate({ to: '/plans/$planId', params: { planId: id } }),
  };

  return <ThemeView screen="plans" props={viewProps} />;
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
