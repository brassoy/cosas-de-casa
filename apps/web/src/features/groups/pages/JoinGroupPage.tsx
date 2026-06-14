/**
 * JoinGroupPage — CONTAINER de unirse a una peña con PIN.
 *
 * Cablea la lógica real (useJoinGroup, navegación, invalidación, setActiveGroup
 * vía el onSuccess del hook) una sola vez y delega el render en `ThemeView`. La
 * vista mantiene el input controlado, la sanitización del PIN base32 Crockford y
 * la validación de UI; el container mapea el error de negocio (`friendlyJoinError`
 * 404/410/409) y navega al detalle al unirse.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useJoinGroup } from '../hooks/useGroups';
import { ApiRequestError } from '@/shared/lib/api';
import type { JoinGroupViewProps } from '../views/types';

function friendlyJoinError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 404)
      return 'El PIN no existe. Comprueba que lo has introducido correctamente.';
    if (err.status === 410)
      return 'El PIN ha caducado. Pide al propietario que genere uno nuevo.';
    if (err.status === 409) return 'Este PIN ya ha sido usado. Solicita uno nuevo.';
    return err.body.message ?? 'No se ha podido unir a la peña. Inténtalo de nuevo.';
  }
  return 'Error inesperado. Inténtalo de nuevo.';
}

export function JoinGroupPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate, isPending } = useJoinGroup();

  function handleSubmit(code: string) {
    setError(null);
    mutate(
      { code },
      {
        onSuccess: async (res) => {
          await navigate({ to: '/groups/$groupId', params: { groupId: res.groupId } });
        },
        onError: (err) => {
          setError(friendlyJoinError(err));
        },
      },
    );
  }

  const props: JoinGroupViewProps = {
    isSubmitting: isPending,
    error,
    onSubmit: handleSubmit,
  };

  return <ThemeView screen="group_join" props={props} />;
}
