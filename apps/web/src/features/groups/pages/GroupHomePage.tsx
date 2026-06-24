/**
 * GroupHomePage — CONTAINER del detalle de peña.
 *
 * Cablea la lógica real (useGroupMembers, useGenerateGroupPin, resolución del rol
 * OWNER, navegación) una sola vez y delega el render en `ThemeView`.
 *
 * Gestión de OWNER por miembro (espejo de `family`): cambiar rol y expulsar. Las
 * acciones por miembro confirman con `window.confirm` (no hay AlertDialog
 * compartido) y reportan errores con `toast` de sonner.
 *
 * Las acciones de editar, borrar y salir de la peña viven en su propia pantalla
 * (`GroupSettingsPage`), accesible con el botón "⚙️ Ajustes" de la cabecera.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ThemeView } from '@/shared/theme/ThemeView';
import {
  useGroupMembers,
  useGenerateGroupPin,
  useRevokeGroupPin,
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

  const { data: members, isLoading, error } = useGroupMembers(groupId);
  const generatePin = useGenerateGroupPin(groupId);
  const revokePin = useRevokeGroupPin(groupId);
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
    onBack: () => void navigate({ to: '/groups' }),
    onGeneratePin: handleGeneratePin,
    // Revocar PIN: solo OWNER y solo si hay un PIN recién generado a la vista.
    onRevokePin: isOwner && generatedPin ? handleRevokePin : undefined,
    pinRevoking: revokePin.isPending,
    pinRevokeError,
    // Ajustes de la peña (editar/borrar/salir): pantalla propia, todos los miembros.
    onOpenSettings: () =>
      void navigate({ to: '/groups/$groupId/settings', params: { groupId } }),
    // ── Gestión de OWNER: solo se cablea cuando el usuario es propietario ──────
    currentUserId: user?.id,
    onChangeMemberRole: isOwner ? handleChangeMemberRole : undefined,
    changingRoleUserId: changeRole.isPending ? changeRole.variables?.userId ?? null : null,
    onExpelMember: isOwner ? handleExpelMember : undefined,
    expellingUserId: expelMember.isPending ? expelMember.variables?.userId ?? null : null,
  };

  return <ThemeView screen="group_home" props={props} />;
}
