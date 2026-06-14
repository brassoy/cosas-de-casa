/**
 * FriendsPage — CONTAINER de "Familias amigas".
 *
 * Cablea la lógica real una sola vez (familyId del store, query + mutaciones,
 * clipboard, navegación, invalidaciones) y delega el render en `ThemeView`, que
 * monta la vista presentacional del theme activo.
 *
 * Flujo:
 *  1. "Generar código de invitación" → POST /families/:id/friend-invites.
 *     El código es de un solo uso (caduca tras usarse). Errores → inviteError.
 *  2. "Canjear código de amistad" → navega a /friends/redeem.
 *  3. Lista de familias amigas (GET /families/:id/friends) con quitar
 *     (DELETE /friends/:linkId) tras confirmación en la vista.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import {
  useFriendFamilies,
  useGenerateFriendInvite,
  useRemoveFriend,
} from '../hooks/useFriends';
import type { FriendsViewProps } from '../views/types';
import { ApiRequestError } from '@/shared/lib/api';

export function FriendsPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);

  const { data: friends, isLoading, error } = useFriendFamilies(activeFamily?.id);
  const generateInvite = useGenerateFriendInvite(activeFamily?.id ?? '');
  const removeFriend = useRemoveFriend(activeFamily?.id);

  function handleGenerateInvite() {
    setInviteError(null);
    setGeneratedCode(null);
    generateInvite.mutate(undefined, {
      onSuccess: (res) => setGeneratedCode(res.code),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido generar el código de invitación.';
        setInviteError(msg);
      },
    });
  }

  function handleCopy(code: string) {
    void navigator.clipboard.writeText(code);
  }

  function handleRemove(linkId: string) {
    setRemoveError(null);
    setRemovingLinkId(linkId);
    removeFriend.mutate(linkId, {
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido quitar la amistad. Inténtalo de nuevo.';
        setRemoveError(msg);
      },
      onSettled: () => setRemovingLinkId(null),
    });
  }

  if (!activeFamily) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <p className="text-muted-foreground">No hay ninguna familia activa.</p>
      </div>
    );
  }

  const props: FriendsViewProps = {
    friends,
    isLoading,
    error: Boolean(error),
    generatedCode,
    isGenerating: generateInvite.isPending,
    inviteError,
    removeError,
    removingLinkId,
    onGenerateInvite: handleGenerateInvite,
    onCopy: handleCopy,
    onRemove: handleRemove,
    onGoRedeem: () => void navigate({ to: '/friends/redeem' }),
    onBack: () =>
      void navigate({ to: '/family/$familyId', params: { familyId: activeFamily.id } }),
  };

  return <ThemeView screen="friends" props={props} />;
}
