/* ─── CookieBanner — aviso de cookies (landing) ───────────────────────────────
 *
 * Aviso sobrio con toque cómic, fijo ABAJO A LA DERECHA para no solapar el CTA de
 * instalación (que va abajo a la izquierda). Guarda la decisión del usuario en
 * localStorage ('cosasdecasa:cookies') y no se vuelve a mostrar.
 *
 * Texto en español de España (tuteo).
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';

const COOKIES_KEY = 'cosasdecasa:cookies';

function alreadyDecided(): boolean {
  try {
    return localStorage.getItem(COOKIES_KEY) !== null;
  } catch {
    return false;
  }
}

export function CookieBanner() {
  // Inicialización perezosa: leemos la decisión guardada en el primer render, sin
  // un useEffect (evita un setState síncrono dentro del efecto). La landing sólo
  // se monta en cliente, así que `localStorage` está disponible.
  const [visible, setVisible] = useState(() => !alreadyDecided());

  if (!visible) return null;

  const decide = (value: 'accepted' | 'rejected') => {
    try {
      localStorage.setItem(COOKIES_KEY, value);
    } catch {
      /* Sin localStorage: cerramos igual aunque no podamos recordar la decisión. */
    }
    setVisible(false);
  };

  return (
    <div className="ld-cookies" role="region" aria-label="Aviso de cookies">
      <span className="ld-cookies-emoji" aria-hidden="true">
        🍪
      </span>
      <p className="sf-fredoka ld-cookies-text">
        Usamos cookies para que la app funcione y recordar tus preferencias.{' '}
        <a href="#" className="ld-cookies-link">
          Más info
        </a>
      </p>
      <div className="ld-cookies-actions">
        <button
          type="button"
          className="ld-cookies-reject sf-fredoka"
          onClick={() => decide('rejected')}
        >
          Rechazar
        </button>
        <button
          type="button"
          className="sf-btn ld-cookies-accept"
          onClick={() => decide('accepted')}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

export default CookieBanner;
