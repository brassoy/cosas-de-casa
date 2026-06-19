/**
 * FamilyHomePage — CONTAINER de la home del hogar.
 *
 * Cablea toda la lógica real una sola vez y delega el render en `ThemeView`:
 *  - Miembros + detección de OWNER: `useFamilyMembers` + `useAuthStore`.
 *  - PIN de invitación: `useGenerateJoinPin` (se guarda la respuesta completa
 *    `GeneratePinResponse` para exponer `expiresAt`).
 *  - Notificaciones como PROPS PURAS (plan §7.E): el estado se deriva de
 *    `useNotificationsStore` + `useSubscribeToPush`; aquí NO se monta el
 *    componente real `NotificationToggle`.
 *  - Grid de accesos rápidos: `onOpen(id)` mapea a ~11 rutas del router.
 *  - Compartir PIN (WhatsApp/Telegram) + copiar al portapapeles.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { GeneratePinResponse, MembershipRole } from '@cosasdecasa/contracts';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useNotificationsStore } from '@/features/notifications/store/notifications.store';
import { useSubscribeToPush } from '@/features/notifications/hooks/useNotifications';
import {
  useChangeMemberRole,
  useDeleteFamily,
  useFamily,
  useFamilyMembers,
  useGenerateJoinPin,
  useLeaveFamily,
  useRemoveMember,
  useRevokeFamilyPin,
  useUpdateFamily,
} from '../hooks/useFamily';
import { useFamilyStore } from '../store/family.store';
import type {
  FamilyHomeViewProps,
  FamilyManageProps,
  FamilyQuickAccess,
} from '../views/types';

// ── Accesos rápidos: id estable (también usado como destino en onOpen) ────────

const QUICK_ACCESS: FamilyQuickAccess[] = [
  { id: 'lists', emoji: '🛒', label: 'Listas de la compra' },
  { id: 'tasks', emoji: '✅', label: 'Tareas' },
  { id: 'fridge', emoji: '🧊', label: 'Nevera' },
  { id: 'stats', emoji: '📊', label: 'Estadísticas' },
  { id: 'calendar', emoji: '📅', label: 'Calendario' },
  { id: 'romantic', emoji: '💕', label: 'Rincón' },
  { id: 'groups', emoji: '🎉', label: 'Peñas' },
  { id: 'plans', emoji: '🗺️', label: 'Planes' },
  { id: 'friends', emoji: '👯', label: 'Familias amigas' },
  { id: 'budget', emoji: '🧾', label: 'Tickets y gasto' },
  { id: 'menu', emoji: '🍳', label: 'Menú de la nevera' },
];

// Copy del estado de notificaciones por permiso (espejo de NotificationToggle).
const NOTIF_HINT: Record<string, string> = {
  unsupported: 'Tu navegador no es compatible con las notificaciones push.',
  denied:
    'Has bloqueado los permisos. Actívalas en Ajustes del navegador → Privacidad → Notificaciones.',
  granted: 'Recibirás avisos de tareas, caducidades y novedades del hogar.',
  default: 'Recibe avisos de tareas, fechas de caducidad y más.',
};

function buildShareText(pin: string): string {
  return `¡Únete a mi familia en Cosas de Casa! Usa el PIN: ${pin}`;
}

/** Mensaje de negocio de una `ApiRequestError`, con fallback genérico. */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export function FamilyHomePage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const familyId = activeFamily?.id ?? '';
  const { data: members, isLoading, error } = useFamilyMembers(activeFamily?.id);
  const generatePin = useGenerateJoinPin(familyId);
  const revokePin = useRevokeFamilyPin(familyId);
  const leaveFamily = useLeaveFamily(familyId);

  // ── Gestión de la familia (solo OWNER) ──────────────────────────────────────
  const isOwner =
    members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;
  // El detalle (nombre/descripción) solo hace falta para el formulario del OWNER.
  const { data: familyDetail } = useFamily(isOwner ? activeFamily?.id : undefined);
  const updateFamily = useUpdateFamily(familyId);
  const deleteFamily = useDeleteFamily(familyId);
  const removeMember = useRemoveMember(familyId);
  const changeMemberRole = useChangeMemberRole(familyId);

  const [generatedPin, setGeneratedPin] = useState<GeneratePinResponse | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinRevokeError, setPinRevokeError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Notificaciones (props puras derivadas del store + mutación) ─────────────
  const { permissionStatus, isSubscribed, isLoading: notifStoreLoading } =
    useNotificationsStore();
  const subscribe = useSubscribeToPush();

  function handleOpen(section: string) {
    if (!activeFamily) return;
    const params = { familyId: activeFamily.id };
    switch (section) {
      case 'lists':
        return void navigate({ to: '/family/$familyId/lists', params });
      case 'tasks':
        return void navigate({ to: '/family/$familyId/tasks', params });
      case 'fridge':
        return void navigate({ to: '/family/$familyId/fridge', params });
      case 'stats':
        return void navigate({ to: '/family/$familyId/stats', params });
      case 'calendar':
        return void navigate({ to: '/family/$familyId/calendar', params });
      case 'romantic':
        return void navigate({ to: '/family/$familyId/romantic', params });
      case 'budget':
        return void navigate({ to: '/family/$familyId/budget', params });
      case 'menu':
        return void navigate({ to: '/family/$familyId/menu', params });
      case 'groups':
        return void navigate({ to: '/groups' });
      case 'plans':
        return void navigate({ to: '/plans' });
      case 'friends':
        return void navigate({ to: '/friends' });
    }
  }

  function handleGeneratePin() {
    setPinError(null);
    generatePin.mutate(undefined, {
      onSuccess: (res) => setGeneratedPin(res),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido generar el PIN.';
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
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido revocar el PIN.';
        setPinRevokeError(msg);
      },
    });
  }

  function handleLeaveFamily() {
    // Confirmación FUERTE: la salida es destructiva (pierde acceso a la familia).
    if (
      !window.confirm(
        '¿Seguro que quieres salir de esta familia? Perderás el acceso a sus listas, tareas, etc.',
      )
    ) {
      return;
    }
    setLeaveError(null);
    leaveFamily.mutate(undefined, {
      // El hook ya limpia la familia activa del store (clearFamily). Navegamos a
      // onboarding ("/") como hace el AppHeader al cerrar sesión.
      onSuccess: async () => {
        await navigate({ to: '/' });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido salir de la familia. Inténtalo de nuevo.';
        setLeaveError(msg);
      },
    });
  }

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

  function handleCopyPin() {
    if (!generatedPin) return;
    void navigator.clipboard.writeText(generatedPin.code);
  }

  function handleShare(channel: 'whatsapp' | 'telegram') {
    if (!generatedPin) return;
    const text = buildShareText(generatedPin.code);
    const url =
      channel === 'whatsapp'
        ? `https://wa.me/?text=${encodeURIComponent(text)}`
        : `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleToggleNotifications() {
    const isActive = permissionStatus === 'granted' && isSubscribed;
    if (permissionStatus === 'unsupported' || permissionStatus === 'denied' || isActive) {
      return;
    }
    subscribe.mutate();
  }

  // Sección "Gestionar familia": solo se cablea para el OWNER. La vista la
  // oculta si `manage` llega undefined (no-OWNER).
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

  const viewProps: FamilyHomeViewProps = useMemo(
    () => ({
      familyId: activeFamily?.id ?? '',
      familyName: activeFamily?.name ?? '',
      isOwner,
      members: members ?? [],
      membersLoading: isLoading,
      membersError: error ? 'No se han podido cargar los miembros.' : null,
      quickAccess: QUICK_ACCESS,
      generatedPin,
      pinLoading: generatePin.isPending,
      pinError,
      notificationsEnabled: permissionStatus === 'granted' && isSubscribed,
      notificationsDisabled:
        permissionStatus === 'unsupported' || permissionStatus === 'denied',
      notificationsHint: subscribe.error
        ? subscribe.error.message
        : NOTIF_HINT[permissionStatus],
      notificationsLoading: notifStoreLoading || subscribe.isPending,
      onToggleNotifications: handleToggleNotifications,
      onGeneratePin: handleGeneratePin,
      onCopyPin: handleCopyPin,
      onShare: handleShare,
      onOpen: handleOpen,
      // Revocar PIN: solo OWNER y solo si hay un PIN recién generado a la vista.
      onRevokePin: isOwner && generatedPin ? handleRevokePin : undefined,
      pinRevoking: revokePin.isPending,
      pinRevokeError,
      // Salir de la familia: disponible para cualquier miembro.
      onLeaveFamily: handleLeaveFamily,
      leaveLoading: leaveFamily.isPending,
      leaveError,
      // Gestionar familia: solo OWNER (undefined en caso contrario).
      manage,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeFamily,
      isOwner,
      members,
      isLoading,
      error,
      generatedPin,
      generatePin.isPending,
      pinError,
      pinRevokeError,
      revokePin.isPending,
      leaveError,
      leaveFamily.isPending,
      permissionStatus,
      isSubscribed,
      notifStoreLoading,
      subscribe.error,
      subscribe.isPending,
      manage,
    ],
  );

  if (!activeFamily) {
    return (
      <div className="min-h-[60dvh] grid place-items-center px-4">
        <p className="text-muted-foreground">No hay ninguna familia activa.</p>
      </div>
    );
  }

  return <ThemeView screen="family_home" props={viewProps} />;
}
