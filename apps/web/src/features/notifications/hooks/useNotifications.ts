/**
 * Hook para gestionar el ciclo de vida de las notificaciones push.
 *
 * Flujo:
 *  1. Comprobar si el navegador soporta Web Push.
 *  2. Solicitar permiso al usuario (Notification.requestPermission).
 *  3. Obtener la suscripción del service worker (pushManager.subscribe).
 *  4. Enviar la suscripción a la API.
 *
 * Endpoints reales (family-scoped):
 *   POST   /families/:familyId/notifications/subscribe
 *     body: PushSubscriptionInput { endpoint, keys: { p256dh, auth } }
 *     → 201 PushSubscriptionDto { id, userId, familyId, endpoint, createdAt }
 *   DELETE /families/:familyId/notifications/subscribe
 *     body: { endpoint }
 *     → 204
 */

import { useMutation } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useNotificationsStore } from '../store/notifications.store';
import type { PushSubscriptionDto, PushSubscriptionInput } from '../types';

export type { ApiRequestError };

// Convierte la clave VAPID Base64Url a Uint8Array para la API del navegador.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getOrCreatePushSubscription(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;

  // Si ya existe una suscripción activa, la devolvemos directamente.
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
  if (!vapidKey) throw new Error('VITE_VAPID_PUBLIC_KEY no está definida en el entorno.');

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    // Uint8Array<ArrayBuffer> es compatible con BufferSource; el cast evita el
    // conflicto de SharedArrayBuffer vs ArrayBuffer que TS 5.x reporta.
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  });
}

function serializeSubscription(sub: PushSubscription): PushSubscriptionInput {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) {
    throw new Error('La suscripción push no contiene las claves necesarias (p256dh, auth).');
  }
  return { endpoint: sub.endpoint, keys: { p256dh, auth } };
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useSubscribeToPush() {
  const { setPermissionStatus, setSubscribed, setLoading } = useNotificationsStore();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  return useMutation<PushSubscriptionDto, Error, void>({
    mutationFn: async () => {
      // 1. Comprobar soporte
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        throw new Error('Tu navegador no soporta notificaciones push.');
      }

      if (!activeFamily) {
        throw new Error('No hay ninguna familia activa. Selecciona una familia primero.');
      }

      setLoading(true);

      // 2. Pedir permiso
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission as 'default' | 'granted' | 'denied');

      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? 'Has denegado los permisos de notificación. Puedes cambiarlos en la configuración del navegador.'
            : 'No se ha concedido el permiso de notificación.',
        );
      }

      // 3. Obtener la suscripción del SW
      const subscription = await getOrCreatePushSubscription();

      // 4. Enviar al backend (family-scoped)
      const payload = serializeSubscription(subscription);
      return api.post<PushSubscriptionDto>(
        `/families/${activeFamily.id}/notifications/subscribe`,
        payload,
      );
    },
    onSuccess: () => {
      setSubscribed(true);
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
    },
  });
}
