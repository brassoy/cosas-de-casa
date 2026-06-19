/**
 * GroupHomePage — CONTAINER del detalle de peña.
 *
 * Cablea la lógica real (useGroupMembers, useGenerateGroupPin, useLeaveGroup,
 * resolución del rol OWNER, navegación) una sola vez y delega el render en
 * `ThemeView`. La confirmación de salida en 2 toques es UI y vive en la vista; el
 * `onLeave` que recibe el container es ya la salida confirmada.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import {
  useGroupMembers,
  useGenerateGroupPin,
  useRevokeGroupPin,
  useLeaveGroup,
} from '../hooks/useGroups';
import { useGroupsStore } from '../store/groups.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';
import type { GroupHomeViewProps } from '../views/types';

export function GroupHomePage() {
  const navigate = useNavigate();
  const { groupId } = useParams({ from: '/groups/$groupId' });
  const activeGroup = useGroupsStore((s) => s.activeGroup);
  const user = useAuthStore((s) => s.user);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinRevokeError, setPinRevokeError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const { data: members, isLoading, error } = useGroupMembers(groupId);
  const generatePin = useGenerateGroupPin(groupId);
  const revokePin = useRevokeGroupPin(groupId);
  const leaveGroup = useLeaveGroup(groupId);

  const isOwner = members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;

  function handleGeneratePin() {
    setPinError(null);
    generatePin.mutate(undefined, {
      onSuccess: (res) => setGeneratedPin(res.code),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError ? err.body.message : 'No se ha podido generar el PIN.';
        setPinError(msg);
      },
    });
  }

  function handleRevokePin() {
    // Confirmación bloqueante: no hay un AlertDialog compartido en el repo.
    if (
      !window.confirm(
        '¿Seguro que quieres revocar el PIN de invitación activo? Dejará de funcionar para quien intente unirse con él.',
      )
    ) {
      return;
    }
    setPinRevokeError(null);
    revokePin.mutate(undefined, {
      // Tras revocar, el PIN mostrado deja de ser válido: lo ocultamos.
      onSuccess: () => setGeneratedPin(null),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError ? err.body.message : 'No se ha podido revocar el PIN.';
        setPinRevokeError(msg);
      },
    });
  }

  function handleLeave() {
    setLeaveError(null);
    leaveGroup.mutate(undefined, {
      onSuccess: async () => {
        await navigate({ to: '/groups' });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido salir de la peña. Inténtalo de nuevo.';
        setLeaveError(msg);
      },
    });
  }

  if (!groupId) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <p className="text-muted-foreground">Peña no encontrada.</p>
      </div>
    );
  }

  const props: GroupHomeViewProps = {
    groupName: activeGroup?.name ?? 'Peña',
    isOwner,
    members,
    membersLoading: isLoading,
    membersError: error ? 'No se han podido cargar los miembros.' : null,
    generatedPin,
    pinLoading: generatePin.isPending,
    pinError,
    leaveLoading: leaveGroup.isPending,
    leaveError,
    onBack: () => void navigate({ to: '/groups' }),
    onGeneratePin: handleGeneratePin,
    // Revocar PIN: solo OWNER y solo si hay un PIN recién generado a la vista.
    onRevokePin: isOwner && generatedPin ? handleRevokePin : undefined,
    pinRevoking: revokePin.isPending,
    pinRevokeError,
    onLeave: handleLeave,
  };

  return <ThemeView screen="group_home" props={props} />;
}
