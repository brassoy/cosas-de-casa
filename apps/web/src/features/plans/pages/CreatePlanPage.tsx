/**
 * CreatePlanPage — CONTAINER del formulario de creación de plan.
 *
 * Cablea la lógica real (familia activa + lugares guardados + mutación de
 * creación) una sola vez y delega el render en `ThemeView`. La vista posee el
 * estado del formulario y emite `place {name,address}` + `savePlace`; el
 * container construye el `CreatePlanInput` y navega al detalle tras crear.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useCreatePlan, useSavedPlaces } from '../hooks/usePlans';
import type { PlaceDto } from '../contracts';
import type { CreatePlanViewProps, CreatePlanFormValues } from '../views/types';
import { ApiRequestError } from '@/shared/lib/api';

export function CreatePlanPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: savedPlaces } = useSavedPlaces(activeFamily?.id);
  const createPlan = useCreatePlan(activeFamily?.id ?? '');

  function handleSubmit(values: CreatePlanFormValues) {
    setErrorMsg(null);

    if (!values.title.trim()) {
      setErrorMsg('El título del plan es obligatorio.');
      return;
    }

    // La vista emite place {name,address}; el TODO(maps) de lat/lng vive aquí.
    const place: PlaceDto | undefined = values.place
      ? { name: values.place.name, address: values.place.address }
      : undefined;

    createPlan.mutate(
      {
        title: values.title.trim(),
        description: values.description,
        scheduledAt: values.scheduledAt,
        place,
        savePlace: Boolean(values.savePlace && place),
      },
      {
        onSuccess: (plan) => {
          void navigate({ to: '/plans/$planId', params: { planId: plan.id } });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear el plan. Inténtalo de nuevo.';
          setErrorMsg(msg);
        },
      },
    );
  }

  if (!activeFamily) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  const viewProps: CreatePlanViewProps = {
    savedPlaces: savedPlaces ?? [],
    isSubmitting: createPlan.isPending,
    error: errorMsg,
    onSubmit: handleSubmit,
    onCancel: () => void navigate({ to: '/plans' }),
  };

  return <ThemeView screen="plan_create" props={viewProps} />;
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
