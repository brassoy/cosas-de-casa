/**
 * CreateGroupPage — CONTAINER de crear peña.
 *
 * Cablea la lógica real (useCreateGroup, navegación, invalidación, setActiveGroup
 * vía el onSuccess del hook) una sola vez y delega el render en `ThemeView`. La
 * vista mantiene el formulario controlado y la validación de UI; el container mapea
 * el error de negocio (`ApiRequestError`) y navega al detalle al crear.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useCreateGroup } from '../hooks/useGroups';
import { ApiRequestError } from '@/shared/lib/api';
import type { CreateGroupViewProps } from '../views/types';

export function CreateGroupPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateGroup();

  function handleSubmit(input: { name: string; description?: string }) {
    setError(null);
    mutate(input, {
      onSuccess: async (group) => {
        await navigate({ to: '/groups/$groupId', params: { groupId: group.id } });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido crear la peña. Inténtalo de nuevo.';
        setError(msg);
      },
    });
  }

  const props: CreateGroupViewProps = {
    isSubmitting: isPending,
    error,
    onSubmit: handleSubmit,
  };

  return <ThemeView screen="group_create" props={props} />;
}
