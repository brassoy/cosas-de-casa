/**
 * GroupHomePage — CONTAINER del detalle de peña.
 *
 * Cablea la lógica real (useGroupMembers, useGenerateGroupPin, useLeaveGroup,
 * resolución del rol OWNER, navegación) una sola vez y delega el render en
 * `ThemeView`. La confirmación de salida en 2 toques es UI y vive en la vista; el
 * `onLeave` que recibe el container es ya la salida confirmada.
 *
 * Gestión de OWNER (espejo de `family`): cambiar rol y expulsar miembros, editar
 * nombre/descripción y borrar la peña. Las acciones por miembro confirman con
 * `window.confirm` (no hay AlertDialog compartido) y reportan errores con `toast`
 * de sonner; la edición y el borrado además exponen el error inline a la vista.
 * Tras borrar, el container navega al listado de peñas (`/groups`).
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ThemeView } from '@/shared/theme/ThemeView';
import {
  useGroupMembers,
  useGenerateGroupPin,
  useRevokeGroupPin,
  useLeaveGroup,
  useUpdateGroup,
  useDeleteGroup,
  useChangeGroupMemberRole,
  useExpelGroupMember,
} from '../hooks/useGroups';
import { useGroupsStore } from '../store/groups.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';
import type { GroupRole } from '../contracts';
import type { GroupHomeViewProps } from '../views/types';

/** Mensaje legible a partir de un error de la API (o un fallback). */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export function GroupHomePage() {
  const navigate = useNavigate();
  const { groupId } = useParams({ from: '/groups/$groupId' });
  const activeGroup = useGroupsStore((s) => s.activeGroup);
  const user = useAuthStore((s) => s.user);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinRevokeError, setPinRevokeError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: members, isLoading, error } = useGroupMembers(groupId);
  const generatePin = useGenerateGroupPin(groupId);
  const revokePin = useRevokeGroupPin(groupId);
  const leaveGroup = useLeaveGroup(groupId);
  const updateGroup = useUpdateGroup(groupId);
  const deleteGroup = useDeleteGroup(groupId);
  const changeRole = useChangeGroupMemberRole(groupId);
  const expelMember = useExpelGroupMember(groupId);

  const isOwner = members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;

  function handleGeneratePin() {
    setPinError(null);
    generatePin.mutate(undefined, {
      onSuccess: (res) => setGeneratedPin(res.code),
      onError: (err) => setPinError(errorMessage(err, 'No se ha podido generar el PIN.')),
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
      onError: (err) => setPinRevokeError(errorMessage(err, 'No se ha podido revocar el PIN.')),
    });
  }

  function handleLeave() {
    setLeaveError(null);
    leaveGroup.mutate(undefined, {
      onSuccess: async () => {
        await navigate({ to: '/groups' });
      },
      onError: (err) =>
        setLeaveError(
          errorMessage(err, 'No se ha podido salir de la peña. Inténtalo de nuevo.'),
        ),
    });
  }

  // ── Gestión de OWNER ────────────────────────────────────────────────────────

  function handleChangeMemberRole(userId: string, role: GroupRole) {
    changeRole.mutate(
      { userId, role },
      {
        onSuccess: () => {
          toast.success(
            role === 'OWNER'
              ? 'Miembro ascendido a propietario.'
              : 'Propietario degradado a miembro.',
          );
        },
        onError: (err) =>
          toast.error(errorMessage(err, 'No se ha podido cambiar el rol del miembro.')),
      },
    );
  }

  function handleExpelMember(userId: string) {
    const target = members?.find((m) => m.userId === userId);
    const name = target?.displayName ?? 'este miembro';
    if (!window.confirm(`¿Seguro que quieres expulsar a ${name} de la peña?`)) {
      return;
    }
    expelMember.mutate(
      { userId },
      {
        onSuccess: () => toast.success(`Has expulsado a ${name} de la peña.`),
        onError: (err) =>
          toast.error(errorMessage(err, 'No se ha podido expulsar al miembro.')),
      },
    );
  }

  function handleUpdateGroup(input: { name?: string; description?: string }) {
    setUpdateError(null);
    updateGroup.mutate(input, {
      onSuccess: () => toast.success('Peña actualizada.'),
      onError: (err) => {
        const msg = errorMessage(err, 'No se ha podido actualizar la peña.');
        setUpdateError(msg);
        toast.error(msg);
      },
    });
  }

  function handleDeleteGroup() {
    setDeleteError(null);
    deleteGroup.mutate(undefined, {
      onSuccess: async () => {
        toast.success('Peña borrada.');
        await navigate({ to: '/groups' });
      },
      onError: (err) => {
        const msg = errorMessage(err, 'No se ha podido borrar la peña.');
        setDeleteError(msg);
        toast.error(msg);
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
    // ── Gestión de OWNER: solo se cablea cuando el usuario es propietario ──────
    currentUserId: user?.id,
    onChangeMemberRole: isOwner ? handleChangeMemberRole : undefined,
    changingRoleUserId: changeRole.isPending ? changeRole.variables?.userId ?? null : null,
    onExpelMember: isOwner ? handleExpelMember : undefined,
    expellingUserId: expelMember.isPending ? expelMember.variables?.userId ?? null : null,
    onUpdateGroup: isOwner ? handleUpdateGroup : undefined,
    groupDescription: undefined,
    updateLoading: updateGroup.isPending,
    updateError,
    onDeleteGroup: isOwner ? handleDeleteGroup : undefined,
    deleteLoading: deleteGroup.isPending,
    deleteError,
  };

  return <ThemeView screen="group_home" props={props} />;
}
