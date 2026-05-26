/**
 * Overlay festivo que aparece durante ~2 s al añadir un ítem con éxito.
 *
 * - Muestra un GIF (si hay alguno configurado) o un emoji animado CSS.
 * - Muestra una frase aleatoria del config.
 * - Enlaza al perfil de LinkedIn del proyecto (VITE_LINKEDIN_URL).
 * - Respeta `prefers-reduced-motion`: sin GIF ni animación CSS, solo la frase.
 *
 * Uso: monta el componente con una `key` diferente cada vez que se quiera
 * mostrar una frase nueva (e.g. `key={showCount}`). El estado inicial de frase
 * y GIF se selecciona en el lazy initializer de useState, que solo corre al
 * montar el componente.
 */

import { useEffect, useState } from 'react';
import { pickRandomPhrase, pickRandomGif } from '../config/onadd.config';

interface AddSuccessOverlayProps {
  /** Controla la visibilidad del overlay. */
  visible: boolean;
  /** Callback al cerrar (por timeout o por clic). */
  onClose: () => void;
}

const LINKEDIN_URL = (import.meta.env.VITE_LINKEDIN_URL as string | undefined) ?? '#';
const AUTO_CLOSE_MS = 2000;

export function AddSuccessOverlay({ visible, onClose }: AddSuccessOverlayProps) {
  // Lazy initializer: se evalúa solo al montar el componente.
  // El padre debe cambiar la `key` para obtener una frase/gif nuevos.
  const [phrase] = useState<string>(() => pickRandomPhrase());
  const [gif] = useState<string | null>(() => pickRandomGif());

  // Cierre automático tras AUTO_CLOSE_MS.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  // Detectar preferencia de movimiento reducido.
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const visibleGif = reducedMotion ? null : gif;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Artículo añadido"
      style={overlayStyles.container}
      onClick={onClose}
    >
      {/* GIF o emoji animado */}
      <div style={overlayStyles.media} aria-hidden="true">
        {visibleGif ? (
          <img
            src={visibleGif}
            alt=""
            style={overlayStyles.gif}
          />
        ) : (
          <span
            style={{
              ...overlayStyles.emoji,
              ...(reducedMotion ? {} : overlayStyles.emojiAnimated),
            }}
          >
            🛒
          </span>
        )}
      </div>

      {/* Frase */}
      <p style={overlayStyles.phrase}>{phrase}</p>

      {/* Enlace LinkedIn */}
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={overlayStyles.link}
        onClick={(e) => e.stopPropagation()}
        aria-label="Ver perfil de LinkedIn del proyecto"
      >
        LinkedIn
      </a>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const overlayStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 'var(--space-6, 24px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2, 8px)',
    padding: 'var(--space-4, 16px) var(--space-6, 24px)',
    backgroundColor: 'var(--color-surface-raised, #fff)',
    border: '1px solid var(--color-border, #e5e7eb)',
    borderRadius: 'var(--radius-xl, 16px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    cursor: 'pointer',
    maxWidth: 'calc(100vw - 48px)',
    textAlign: 'center',
    // Entrada: desliza desde abajo
    animation: 'slideUpFade 0.25s ease-out forwards',
  },
  media: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '56px',
  },
  gif: {
    height: '56px',
    borderRadius: 'var(--radius-md, 8px)',
    objectFit: 'contain',
  },
  emoji: {
    fontSize: '40px',
    lineHeight: '1',
  },
  emojiAnimated: {
    animation: 'bounceEmoji 0.6s ease-in-out',
  },
  phrase: {
    fontSize: 'var(--font-size-sm, 14px)',
    fontWeight: 'var(--font-weight-semibold, 600)' as React.CSSProperties['fontWeight'],
    color: 'var(--color-text, #111)',
    margin: 0,
    lineHeight: '1.4',
  },
  link: {
    fontSize: 'var(--font-size-xs, 12px)',
    color: 'var(--color-accent, #2563eb)',
    textDecoration: 'underline',
    lineHeight: '1',
  },
};
