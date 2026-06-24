/**
 * GroupSettingsPage — CONTAINER de la pantalla "Ajustes de la peña".
 *
 * Saca de la home del detalle de peña (`GroupHomePage`) las acciones de editar,
 * borrar y salir a su propia pantalla. Cablea la lógica real (useUpdateGroup,
 * useDeleteGroup, useLeaveGroup, resolución del rol OWNER, navegación) una sola
 * vez y delega el render en `ThemeView`. Espejo de `FamilyManagePage`.
 *
 * Las confirmaciones en 2 toques de salir/borrar son UI y viven en la vista; el
 * container recibe la confirmación final y ejecuta la mutación. Tras borrar o
 * salir, navega al listado de peñas (`/groups`); `onBack` vuelve al home de la
 * peña. Si el usuario no es OWNER, las props de editar/borrar van `undefined`, así
 * la vista solo muestra "Salir".
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ThemeView } from '@/shared/theme/ThemeView';
import {
  useGroupMembers,
  useLeaveGroup,
  useUpdateGroup,
  useDeleteGroup,
} from '../hooks/useGroups';
import { useGroupsStore } from '../store/groups.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';
import type { GroupSettingsViewProps } from '../views/types';

/** Mensaje legible a partir de un error de la API (o un fallback). */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export function GroupSettingsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams({ from: '/groups/$groupId/settings' });
  const activeGroup = useGroupsStore((s) => s.activeGroup);
  const user = useAuthStore((s) => s.user);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: members } = useGroupMembers(groupId);
  const leaveGroup = useLeaveGroup(groupId);
  const updateGroup = useUpdateGroup(groupId);
  const deleteGroup = useDeleteGroup(groupId);

  const isOwner = members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;

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

  const props: GroupSettingsViewProps = {
    groupName: activeGroup?.name ?? 'Peña',
    isOwner,
    onUpdateGroup: isOwner ? handleUpdateGroup : undefined,
    groupDescription: undefined,
    updateLoading: updateGroup.isPending,
    updateError,
    onDeleteGroup: isOwner ? handleDeleteGroup : undefined,
    deleteLoading: deleteGroup.isPending,
    deleteError,
    onLeave: handleLeave,
    leaveLoading: leaveGroup.isPending,
    leaveError,
    onBack: () => void navigate({ to: '/groups/$groupId', params: { groupId } }),
  };

  return <ThemeView screen="group_settings" props={props} />;
}
