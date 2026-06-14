/**
 * RedeemFriendPage — CONTAINER de "Canjear código de amistad".
 *
 * Cablea la lógica real una sola vez (familyId del store, mutación de canje,
 * validación, navegación e invalidación global de `['friends']`) y delega el
 * render en `ThemeView`, que monta la vista presentacional del theme activo.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useRedeemFriendInvite } from '../hooks/useFriends';
import type { FriendRedeemViewProps } from '../views/types';
import { ApiRequestError } from '@/shared/lib/api';

export function RedeemFriendPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redeemInvite = useRedeemFriendInvite();

  function handleSubmit() {
    setErrorMsg(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMsg('Introduce el código de invitación.');
      return;
    }

    redeemInvite.mutate(
      { code: trimmed, familyId: activeFamily?.id ?? '' },
      {
        onSuccess: () => {
          void navigate({ to: '/friends', search: {} });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido canjear el código. Inténtalo de nuevo.';
          setErrorMsg(msg);
        },
      },
    );
  }

  const props: FriendRedeemViewProps = {
    code,
    familyName: activeFamily?.name,
    error: errorMsg,
    isSubmitting: redeemInvite.isPending,
    onCodeChange: setCode,
    onSubmit: handleSubmit,
    onBack: () => void navigate({ to: '/friends' }),
  };

  return <ThemeView screen="friends_redeem" props={props} />;
}
