/**
 * useFamilyManage — cableado de la GESTIÓN de la familia (solo OWNER).
 *
 * Encapsula toda la lógica de administración que antes vivía embebida en
 * `FamilyHomePage`: detección de OWNER, mutaciones (editar nombre/descripción,
 * borrar familia, expulsar miembro, cambiar rol), estado de errores/carga y los
 * handlers con sus confirmaciones (`window.confirm`) y `toast`.
 *
 * Lo consumen los containers (`FamilyManagePage`). Devuelve `manage` como
 * `FamilyManageProps | undefined`: es `undefined` para quien no es OWNER, de
 * modo que la vista pueda ocultar/avisar sin lógica propia.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { MembershipRole } from '@cosasdecasa/contracts';
import { ApiRequestError } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import {
  useChangeMemberRole,
  useDeleteFamily,
  useFamily,
  useFamilyMembers,
  useRemoveMember,
  useUpdateFamily,
} from './useFamily';
import { useFamilyStore } from '../store/family.store';
import type { FamilyManageProps } from '../views/types';

/** Mensaje de negocio de una `ApiRequestError`, con fallback genérico. */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export interface UseFamilyManageResult {
  /** El usuario autenticado es OWNER de la familia activa. */
  isOwner: boolean;
  /** La carga de miembros está en curso. */
  membersLoading: boolean;
  /**
   * Datos y callbacks de la sección "Gestionar familia". `undefined` si el
   * usuario no es OWNER (o no hay familia activa).
   */
  manage: FamilyManageProps | undefined;
}

export function useFamilyManage(): UseFamilyManageResult {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const familyId = activeFamily?.id ?? '';
  const { data: members, isLoading: membersLoading } = useFamilyMembers(activeFamily?.id);

  const isOwner =
    members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;
  // El detalle (nombre/descripción) solo hace falta para el formulario del OWNER.
  const { data: familyDetail } = useFamily(isOwner ? activeFamily?.id : undefined);
  const updateFamily = useUpdateFamily(familyId);
  const deleteFamily = useDeleteFamily(familyId);
  const removeMember = useRemoveMember(familyId);
  const changeMemberRole = useChangeMemberRole(familyId);

  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Gestión de miembros (solo OWNER) ───────────────────────────────────────

  function handleChangeRole(userId: string, role: MembershipRole) {
    const target = members?.find((m) => m.userId === userId);
    if (target && target.role === role) return; // sin cambios
    setMemberError(null);
    setRoleChangingId(userId);
    changeMemberRole.mutate(
      { userId, role },
      {
        onSuccess: () => toast.success('Rol actualizado.'),
        onError: (err) => {
          const msg = errorMessage(err, 'No se ha podido cambiar el rol.');
          setMemberError(msg);
          toast.error(msg);
        },
        onSettled: () => setRoleChangingId(null),
      },
    );
  }

  function handleRemoveMember(userId: string) {
    const target = members?.find((m) => m.userId === userId);
    const who = target ? `a ${target.displayName}` : 'a este miembro';
    if (!window.confirm(`¿Seguro que quieres expulsar ${who} de la familia?`)) {
      return;
    }
    setMemberError(null);
    setRemovingId(userId);
    removeMember.mutate(userId, {
      onSuccess: () => toast.success('Miembro expulsado.'),
      onError: (err) => {
        const msg = errorMessage(err, 'No se ha podido expulsar al miembro.');
        setMemberError(msg);
        toast.error(msg);
      },
      onSettled: () => setRemovingId(null),
    });
  }

  // ── Editar nombre/descripción (solo OWNER) ─────────────────────────────────

  function handleSaveDetails(input: { name?: string; description?: string }) {
    setDetailsError(null);
    updateFamily.mutate(input, {
      onSuccess: () => toast.success('Familia actualizada.'),
      onError: (err) => {
        const msg = errorMessage(err, 'No se ha podido guardar la familia.');
        setDetailsError(msg);
        toast.error(msg);
      },
    });
  }

  // ── Borrar la familia (solo OWNER) ─────────────────────────────────────────

  function handleDeleteFamily() {
    // Confirmación FUERTE: el borrado es irreversible para toda la familia.
    if (
      !window.confirm(
        '¿Seguro que quieres BORRAR la familia? Se eliminarán sus listas, tareas y datos para todos los miembros. Esta acción NO se puede deshacer.',
      )
    ) {
      return;
    }
    setDeleteError(null);
    deleteFamily.mutate(undefined, {
      // El hook ya limpia la familia activa del store (clearFamily). Navegamos a
      // onboarding ("/") como tras salir de la familia.
      onSuccess: async () => {
        toast.success('Familia borrada.');
        await navigate({ to: '/' });
      },
      onError: (err) => {
        const msg = errorMessage(err, 'No se ha podido borrar la familia.');
        setDeleteError(msg);
        toast.error(msg);
      },
    });
  }

  // Sección "Gestionar familia": solo se cablea para el OWNER. La vista la
  // oculta/avisa si `manage` llega undefined (no-OWNER).
  const manage: FamilyManageProps | undefined = useMemo(() => {
    if (!isOwner) return undefined;
    return {
      onChangeRole: handleChangeRole,
      onRemoveMember: handleRemoveMember,
      currentUserId: user?.id ?? '',
      roleChangingId,
      removingId,
      memberError,
      initialName: familyDetail?.name ?? activeFamily?.name ?? '',
      initialDescription: familyDetail?.description ?? '',
      onSaveDetails: handleSaveDetails,
      detailsSaving: updateFamily.isPending,
      detailsError,
      onDeleteFamily: handleDeleteFamily,
      deleteLoading: deleteFamily.isPending,
      deleteError,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOwner,
    user?.id,
    roleChangingId,
    removingId,
    memberError,
    familyDetail,
    activeFamily,
    updateFamily.isPending,
    detailsError,
    deleteFamily.isPending,
    deleteError,
  ]);

  return { isOwner, membersLoading, manage };
}
