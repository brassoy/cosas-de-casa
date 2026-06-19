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
import type { GeneratePinResponse } from '@cosasdecasa/contracts';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useNotificationsStore } from '@/features/notifications/store/notifications.store';
import { useSubscribeToPush } from '@/features/notifications/hooks/useNotifications';
import {
  useFamilyMembers,
  useGenerateJoinPin,
  useLeaveFamily,
  useRevokeFamilyPin,
} from '../hooks/useFamily';
import { useFamilyStore } from '../store/family.store';
import type { FamilyHomeViewProps, FamilyQuickAccess } from '../views/types';

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

export function FamilyHomePage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const { data: members, isLoading, error } = useFamilyMembers(activeFamily?.id);
  const generatePin = useGenerateJoinPin(activeFamily?.id ?? '');
  const revokePin = useRevokeFamilyPin(activeFamily?.id ?? '');
  const leaveFamily = useLeaveFamily(activeFamily?.id ?? '');

  const [generatedPin, setGeneratedPin] = useState<GeneratePinResponse | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinRevokeError, setPinRevokeError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // ── Notificaciones (props puras derivadas del store + mutación) ─────────────
  const { permissionStatus, isSubscribed, isLoading: notifStoreLoading } =
    useNotificationsStore();
  const subscribe = useSubscribeToPush();

  const isOwner =
    members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;

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
