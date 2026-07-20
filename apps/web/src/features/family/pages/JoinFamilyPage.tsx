/**
 * JoinFamilyPage — CONTAINER para unirse a una familia con un PIN.
 *
 * La vista (`JoinFamilyView`) ya sanitiza el input (uppercase/filtro/slice 8) y
 * valida la longitud; este container hace la validación de FORMATO Crockford
 * definitiva y traduce los errores de negocio (`friendlyJoinError`: 404/410/409).
 * La mutación `useJoinFamily` ya hace `setActiveFamily` + invalidate en su
 * `onSuccess`. Delega el render en `ThemeView`.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { JOIN_PIN_LENGTH } from '@cosasdecasa/contracts';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import { useJoinFamily } from '../hooks/useFamily';
import type { JoinFamilyViewProps } from '../views/types';

// PIN: 8 caracteres, Base32 Crockford (0-9 A-Z excluyendo I, L, O, U).
const PIN_REGEX = /^[0-9A-HJKMNP-TV-Z]{8}$/;

function friendlyJoinError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 404) return 'El PIN no existe. Comprueba que lo has introducido correctamente.';
    if (err.status === 410) return 'El PIN ha caducado. Pide al propietario que genere uno nuevo.';
    if (err.status === 409) return 'Este PIN ya ha sido usado. Solicita uno nuevo.';
    return err.body.message ?? 'No se ha podido unir a la familia. Inténtalo de nuevo.';
  }
  return 'Error inesperado. Inténtalo de nuevo.';
}

export function JoinFamilyPage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useJoinFamily();
  const [error, setError] = useState<string | null>(null);

  const viewProps: JoinFamilyViewProps = {
    isSubmitting: isPending,
    error,
    onBack: () => void navigate({ to: '/onboarding' }),
    onSubmit: (code) => {
      setError(null);

      if (code.length !== JOIN_PIN_LENGTH || !PIN_REGEX.test(code)) {
        setError(
          'El PIN contiene caracteres no válidos. Usa solo letras (sin I, L, O, U) y números.',
        );
        return;
      }

      mutate(
        { code },
        {
          onSuccess: async (res) => {
            await navigate({
              to: '/family/$familyId',
              params: { familyId: res.familyId },
            });
          },
          onError: (err) => setError(friendlyJoinError(err)),
        },
      );
    },
  };

  return <ThemeView screen="family_join" props={viewProps} />;
}
