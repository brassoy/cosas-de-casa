/**
 * Instalación de la PWA — estado compartido.
 *
 * Captura `beforeinstallprompt` A NIVEL DE MÓDULO (el evento se dispara una
 * sola vez y muy pronto; si se escuchara al montar un componente del dashboard
 * llegaría tarde) y lo expone con un store mínimo para `useSyncExternalStore`.
 *
 * Dos mundos:
 *  - Android/Chromium: hay evento diferido → `promptInstall()` abre el diálogo
 *    nativo con un tap.
 *  - iOS/Safari: `beforeinstallprompt` NO existe; la única vía es manual
 *    (Compartir → «Añadir a pantalla de inicio»), así que la UI debe mostrar
 *    instrucciones, no un botón.
 *
 * Convive con el InstallPrompt de la landing (que registra su propio listener):
 * varios listeners del mismo evento son válidos; `prompt()` solo puede
 * llamarse una vez y quien llegue primero gana (el otro cae con elegancia).
 */

import { useSyncExternalStore } from 'react';

export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
};

/** ¿La app ya corre como aplicación instalada? (standalone o iOS legacy). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

/** ¿Es iOS? (incluye iPadOS moderno, que se presenta como MacIntel táctil). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// ── Store del evento diferido ────────────────────────────────────────────────

let deferredEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredEvent = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    notify();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lanza el diálogo nativo de instalación (si hay evento diferido). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferredEvent;
  if (!event) return 'unavailable';
  deferredEvent = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome;
  } catch {
    // El navegador rechazó el prompt (p. ej. ya consumido por la landing).
    return 'unavailable';
  }
}

/** true si hay evento diferido → se puede instalar con un tap. */
export function usePwaCanPrompt(): boolean {
  return useSyncExternalStore(subscribe, () => deferredEvent !== null);
}
