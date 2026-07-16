/**
 * InstallAppCard — card «instala la app» para el dashboard.
 *
 * Se muestra SOLO cuando la app corre en el navegador (no standalone) y hay
 * algo accionable: instalación con un tap (Android/Chromium, evento diferido)
 * o instrucciones manuales (iOS, donde no existe `beforeinstallprompt`).
 *
 * El descarte (X) caduca a los 30 días — a diferencia del prompt de la
 * landing, que es para siempre — porque instalar aporta valor real (pantalla
 * completa, offline) y merece una segunda oportunidad. La vía permanente tras
 * descartar es la entrada «Instalar la app» del menú lateral.
 *
 * Nota iOS: tras instalar manualmente no hay evento `appinstalled`, así que la
 * card no puede autoocultarse en la pestaña del navegador; la X y la caducidad
 * cubren ese caso.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import {
  isIOS,
  isStandalone,
  promptInstall,
  usePwaCanPrompt,
} from '@/shared/lib/pwa-install';

const DISMISSED_AT_KEY = 'cosasdecasa:install-card-dismissed-at';
const DISMISS_DAYS = 30;

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    /* localStorage no disponible: se ocultará solo esta sesión. */
  }
}

export function InstallAppCard() {
  const canPrompt = usePwaCanPrompt();
  const [dismissed, setDismissed] = useState(isRecentlyDismissed);

  const onIOS = isIOS();
  if (dismissed || isStandalone() || (!canPrompt && !onIOS)) return null;

  function dismiss() {
    rememberDismissal();
    setDismissed(true);
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === 'accepted') dismiss();
  }

  return (
    <Card className="relative flex items-start gap-3 p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute right-2 top-2 px-1 text-muted-foreground"
        onClick={dismiss}
      >
        ✕
      </button>
      <span aria-hidden className="text-2xl">📲</span>
      <div className="min-w-0 space-y-1 pr-5">
        <p className="font-semibold">Instala Cosas de Casa</p>
        {onIOS ? (
          <p className="text-sm text-muted-foreground">
            Toca <span aria-hidden>⎋</span> <strong>Compartir</strong> y elige{' '}
            <strong>«Añadir a pantalla de inicio»</strong>: la tendrás a pantalla
            completa y con funciones sin conexión.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              A pantalla completa, con icono propio y funciones sin conexión.
            </p>
            <Button size="sm" className="mt-1" onClick={() => void handleInstall()}>
              Instalar
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
