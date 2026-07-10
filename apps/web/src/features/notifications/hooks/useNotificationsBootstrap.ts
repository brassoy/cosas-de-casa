/**
 * useNotificationsBootstrap — hidratación + auto-activación de notificaciones.
 *
 * Se monta desde el dashboard (FamilyHomePage). Dos responsabilidades:
 *
 *  1. HIDRATACIÓN (siempre): sincroniza el store con el estado REAL del
 *     navegador. El store arranca con `isSubscribed: false` y nunca se hidrata,
 *     así que el toggle salía OFF aunque el navegador ya estuviera suscrito.
 *     Aquí leemos `pushManager.getSubscription()` y `Notification.permission`.
 *
 *  2. AUTO-ACTIVACIÓN (una sola vez): decisión del usuario — al entrar al
 *     dashboard con sesión y familia activa activamos las notificaciones por
 *     defecto:
 *       - permission === 'granted' y sin suscripción → suscribimos en silencio.
 *       - permission === 'default' → lanzamos `requestPermission()` una única
 *         vez (persistimos el flag `notifications-prompted-v1` en localStorage
 *         para NO volver a preguntar tras denegar o descartar).
 *       - permission === 'denied' | 'unsupported' → no hacemos nada.
 *
 * Todos los accesos a `Notification` / `serviceWorker` van guardados: solo
 * existen en browser y la PWA puede correr sin SW en dev.
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useNotificationsStore } from '../store/notifications.store';
import { useSubscribeToPush } from './useNotifications';
import type { NotificationPermissionStatus } from '../types';

const PROMPTED_KEY = 'notifications-prompted-v1';

function hasBrowserPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  );
}

function readPromptedFlag(): boolean {
  try {
    return localStorage.getItem(PROMPTED_KEY) === '1';
  } catch {
    return false;
  }
}

function writePromptedFlag(): void {
  try {
    localStorage.setItem(PROMPTED_KEY, '1');
  } catch {
    // localStorage puede no estar disponible (modo privado); no es crítico.
  }
}

export function useNotificationsBootstrap(): void {
  const session = useAuthStore((s) => s.session);
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const setSubscribed = useNotificationsStore((s) => s.setSubscribed);
  const setPermissionStatus = useNotificationsStore((s) => s.setPermissionStatus);
  const subscribe = useSubscribeToPush();

  // Garantiza que la auto-activación corre una única vez por montaje de la app.
  const autoRanRef = useRef(false);

  // 1. Hidratación del store con el estado real del navegador.
  useEffect(() => {
    if (!hasBrowserPush()) return;
    let cancelled = false;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (cancelled) return;
        setSubscribed(!!sub);
        setPermissionStatus(Notification.permission as NotificationPermissionStatus);
      } catch {
        // Sin SW (p.ej. dev sin PWA) no podemos hidratar; el store se queda
        // con su valor inicial derivado de Notification.permission.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setSubscribed, setPermissionStatus]);

  // 2. Auto-activación una sola vez al entrar con sesión + familia activa.
  useEffect(() => {
    if (autoRanRef.current) return;
    if (!session || !activeFamily) return;
    if (!hasBrowserPush()) return;

    const permission = Notification.permission;
    if (permission === 'denied') return;

    if (permission === 'granted') {
      autoRanRef.current = true;
      void (async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            setSubscribed(true);
          } else {
            // La mutación pide permiso (ya concedido → resuelve al instante),
            // crea la suscripción y la envía al backend.
            subscribe.mutate();
          }
        } catch {
          // Sin SW no hay nada que suscribir.
        }
      })();
      return;
    }

    // permission === 'default': preguntamos una sola vez en la vida de la app.
    if (readPromptedFlag()) return;
    autoRanRef.current = true;
    writePromptedFlag();
    // La mutación dispara Notification.requestPermission() y, si se concede,
    // crea la suscripción y la envía al backend.
    subscribe.mutate();
  }, [session, activeFamily, subscribe, setSubscribed]);
}
