/**
 * FamilyHomePage — CONTAINER de la home del hogar.
 *
 * Cablea toda la lógica real una sola vez y delega el render en `ThemeView`:
 *  - Notificaciones como PROPS PURAS (plan §7.E): el estado se deriva de
 *    `useNotificationsStore` + `useSubscribeToPush`; aquí NO se monta el
 *    componente real `NotificationToggle`.
 *  - Grid de accesos rápidos: `onOpen(id)` mapea a ~11 rutas del router.
 *  - Card de cabecera clicable: `onManageFamily` navega a la pantalla
 *    "Gestionar familia" (`/family/$familyId/manage`), donde ahora viven la
 *    invitación por PIN, la lista de miembros y salir de la familia.
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useNotificationsStore } from '@/features/notifications/store/notifications.store';
import { useSubscribeToPush } from '@/features/notifications/hooks/useNotifications';
import { useNotificationsBootstrap } from '@/features/notifications/hooks/useNotificationsBootstrap';
import { useFamilyStore } from '../store/family.store';
import type { FamilyHomeViewProps, FamilyQuickAccess } from '../views/types';

// ── Accesos rápidos: id estable (también usado como destino en onOpen) ────────

const QUICK_ACCESS: FamilyQuickAccess[] = [
  { id: 'lists', emoji: '🛒', label: 'Listas de la compra' },
  { id: 'tasks', emoji: '✅', label: 'Tareas' },
  { id: 'fridge', emoji: '🧊', label: 'Nevera' },
  { id: 'stats', emoji: '📊', label: 'Estadísticas' },
  { id: 'calendar', emoji: '📅', label: 'Calendario' },
  { id: 'routines', emoji: '🗓️', label: 'Rutinas' },
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

export function FamilyHomePage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  // ── Notificaciones (props puras derivadas del store + mutación) ─────────────
  const { permissionStatus, isSubscribed, isLoading: notifStoreLoading } =
    useNotificationsStore();
  const subscribe = useSubscribeToPush();

  // Hidrata el estado real del navegador y auto-activa las notificaciones una
  // sola vez al entrar al dashboard (ver useNotificationsBootstrap). Se invoca
  // antes de cualquier early return para respetar las reglas de los hooks.
  useNotificationsBootstrap();

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
      case 'routines':
        return void navigate({ to: '/family/$familyId/routines', params });
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

  function handleManageFamily() {
    if (!activeFamily) return;
    void navigate({
      to: '/family/$familyId/manage',
      params: { familyId: activeFamily.id },
    });
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
      quickAccess: QUICK_ACCESS,
      notificationsEnabled: permissionStatus === 'granted' && isSubscribed,
      notificationsDisabled:
        permissionStatus === 'unsupported' || permissionStatus === 'denied',
      notificationsHint: subscribe.error
        ? subscribe.error.message
        : NOTIF_HINT[permissionStatus],
      notificationsLoading: notifStoreLoading || subscribe.isPending,
      onToggleNotifications: handleToggleNotifications,
      onOpen: handleOpen,
      onManageFamily: handleManageFamily,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeFamily,
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
