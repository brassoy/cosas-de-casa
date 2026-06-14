/**
 * CreateFamilyPage — CONTAINER de la creación de unidad familiar.
 *
 * Cablea la mutación real (`useCreateFamily`, que ya hace `setActiveFamily` +
 * invalidate `['families']` en su `onSuccess`) y delega el render en `ThemeView`.
 * Tras crear, navega a la home de la nueva familia.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import { useCreateFamily } from '../hooks/useFamily';
import type { CreateFamilyViewProps } from '../views/types';

export function CreateFamilyPage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateFamily();
  const [error, setError] = useState<string | null>(null);

  const viewProps: CreateFamilyViewProps = {
    isSubmitting: isPending,
    error,
    onSubmit: (input) => {
      setError(null);
      mutate(input, {
        onSuccess: async (family) => {
          await navigate({ to: '/family/$familyId', params: { familyId: family.id } });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear la unidad familiar. Inténtalo de nuevo.';
          setError(msg);
        },
      });
    },
  };

  return <ThemeView screen="family_create" props={viewProps} />;
}
