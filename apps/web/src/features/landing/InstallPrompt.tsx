/* ─── InstallPrompt — CTA "instala la PWA" (landing) ──────────────────────────
 *
 * Tarjeta cómic fija ABAJO A LA IZQUIERDA que invita a instalar la app como PWA.
 * Estética Hommer: borde negro grueso, hard shadow, icono de la app con wobble,
 * titular Bangers, botón rojo y X para cerrar. Entra con un rebote.
 *
 * Lógica:
 *   · Escucha `beforeinstallprompt`, lo guarda y hace preventDefault. Al pulsar
 *     "Instalar" llama a prompt() y espera userChoice; si no hay evento diferido
 *     (típico en DEV, donde el SW está apagado y el evento NO se dispara), cierra
 *     con elegancia.
 *   · Se oculta si la app ya está instalada (standalone) o si el usuario lo
 *     descartó antes (localStorage). En DEV/sin evento se muestra igualmente de
 *     forma proactiva tras ~2,5s para que SE VEA.
 *
 * Texto en español de España (tuteo). Sin mención a precio.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';

/* Tipado propio del evento `beforeinstallprompt` (no está en lib.dom estándar),
 * así evitamos `any` y respetamos el lint del proyecto. */
type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
};

const DISMISS_KEY = 'cosasdecasa:install-dismissed';

/* ¿La app ya corre como aplicación instalada? (standalone o iOS legacy). */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Si ya está instalada o ya se descartó, no mostramos nada nunca.
    if (isStandalone() || wasDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      deferred.current = null;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Fallback proactivo: en DEV el SW está apagado y `beforeinstallprompt` NO se
    // dispara, así que el CTA no aparecería. Lo mostramos tras un pequeño margen
    // (salvo que el evento ya nos haya hecho visibles antes).
    const timer = window.setTimeout(() => {
      if (!isStandalone() && !wasDismissed()) setVisible(true);
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* localStorage no disponible: cerramos igual sin persistir. */
    }
  };

  const install = async () => {
    const evt = deferred.current;
    if (evt) {
      try {
        await evt.prompt();
        await evt.userChoice;
      } catch {
        /* El usuario canceló o el navegador rechazó el prompt: cerramos igual. */
      }
      deferred.current = null;
    }
    // Con o sin evento diferido, cerramos con elegancia y recordamos el descarte.
    close();
  };

  return (
    <div className="ld-install" role="dialog" aria-label="Instalar Cosas de Casa">
      <button
        type="button"
        className="ld-install-x"
        aria-label="Cerrar"
        onClick={close}
      >
        ×
      </button>
      <img
        className="ld-install-icon"
        src="/icons/icon-192.png"
        alt="Icono de Cosas de Casa"
        width={64}
        height={64}
        decoding="async"
      />
      <div className="ld-install-body">
        <h3 className="sf-bangers ld-install-title">¡Llévatela en el móvil!</h3>
        <p className="sf-fredoka ld-install-sub">
          Instala la app y úsala a pantalla completa, sin conexión.
        </p>
        <button type="button" className="sf-btn sf-btn-r ld-install-cta" onClick={install}>
          📲 Instalar
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
