/**
 * Botón de micrófono para añadir artículos por voz.
 *
 * Flujo:
 *  1. Usuario pulsa el micrófono → se inicia el reconocimiento de voz (es-ES).
 *  2. Al obtener el transcript final → POST /ai/extract-items {phrase}
 *     → recibe { items: string[] }
 *  3. Se muestran los ítems extraídos como chips confirmables.
 *  4. El usuario quita los que no quiera y pulsa "Añadir seleccionados".
 *  5. Se llama a onAddItems con los nombres confirmados.
 *
 * Supuesto de API:
 *   POST /ai/extract-items
 *   Body: { phrase: string }
 *   Response: { items: string[] }
 *
 * Si la Web Speech API no está soportada, se muestra un aviso discreto.
 * Si el usuario está offline, el botón queda deshabilitado con tooltip.
 */

import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

// TODO(contracts): añadir ExtractItemsResponseDto a @cosasdecasa/contracts
// cuando el backend defina el contrato del endpoint /ai/extract-items.
interface ExtractItemsResponse {
  items: string[];
}

interface VoiceAddButtonProps {
  onAddItems: (names: string[]) => Promise<void>;
  disabled?: boolean;
}

export function VoiceAddButton({ onAddItems, disabled = false }: VoiceAddButtonProps) {
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sincroniza estado online con los eventos del navegador
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const handleFinalTranscript = useCallback(async (transcript: string) => {
    setExtractError(null);
    setExtracting(true);
    try {
      const response = await api.post<ExtractItemsResponse>('/ai/extract-items', {
        phrase: transcript,
      });
      const items = response.items.filter((s) => s.trim().length > 0);
      if (items.length === 0) {
        setExtractError('No se han detectado artículos en lo que has dicho. Inténtalo de nuevo.');
        return;
      }
      setPendingItems(items);
      setSelectedItems(new Set(items));
    } catch {
      setExtractError('No se ha podido extraer los artículos. Inténtalo de nuevo.');
    } finally {
      setExtracting(false);
    }
  }, []);

  const { supported, state, interimTranscript, start, stop, errorMessage } =
    useVoiceRecognition(handleFinalTranscript);

  const isListening = state === 'listening';
  const isProcessing = state === 'processing' || extracting;
  const isDisabled = disabled || !isOnline || !supported;

  function toggleItem(name: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function handleConfirm() {
    const toAdd = pendingItems.filter((n) => selectedItems.has(n));
    if (toAdd.length === 0) {
      setPendingItems([]);
      return;
    }
    setConfirming(true);
    try {
      await onAddItems(toAdd);
      setPendingItems([]);
      setSelectedItems(new Set());
    } finally {
      setConfirming(false);
    }
  }

  function handleDiscard() {
    setPendingItems([]);
    setSelectedItems(new Set());
    setExtractError(null);
  }

  // ── Fallback si la API no está soportada ─────────────────────────────────────
  if (!supported) {
    return (
      <p style={styles.unsupportedMsg} role="status">
        Tu navegador no es compatible con el reconocimiento de voz. Añade los artículos
        escribiéndolos en el campo de texto.
      </p>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Botón principal */}
      <div style={styles.btnRow}>
        <button
          type="button"
          onClick={isListening ? stop : start}
          disabled={isDisabled || isProcessing}
          style={{
            ...styles.micBtn,
            ...(isListening ? styles.micBtnListening : {}),
            ...(isDisabled ? styles.micBtnDisabled : {}),
          }}
          aria-label={isListening ? 'Detener reconocimiento de voz' : 'Añadir por voz'}
          title={
            !isOnline
              ? 'Sin conexión. La voz requiere internet.'
              : !supported
                ? 'Tu navegador no soporta la entrada por voz'
                : isListening
                  ? 'Escuchando… Pulsa para detener'
                  : 'Añadir artículos por voz'
          }
        >
          {isProcessing ? '⏳' : isListening ? '⏹' : '🎙'}
        </button>

        {!isOnline && (
          <span style={styles.offlineHint}>Sin conexión — la voz requiere internet</span>
        )}
      </div>

      {/* Texto interim en tiempo real */}
      {interimTranscript && (
        <p style={styles.interimText} aria-live="polite" role="status">
          "{interimTranscript}…"
        </p>
      )}

      {/* Error de reconocimiento o extracción */}
      {(errorMessage ?? extractError) && (
        <p style={styles.errorMsg} role="alert">
          {errorMessage ?? extractError}
        </p>
      )}

      {/* Chips de confirmación */}
      {pendingItems.length > 0 && (
        <div style={styles.chipsWrapper} role="region" aria-label="Artículos detectados por voz">
          <p style={styles.chipsLabel}>
            Artículos detectados — quita los que no quieras:
          </p>
          <div style={styles.chipsList}>
            {pendingItems.map((name) => {
              const selected = selectedItems.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleItem(name)}
                  style={{
                    ...styles.chip,
                    ...(selected ? styles.chipSelected : styles.chipUnselected),
                  }}
                  aria-pressed={selected}
                  aria-label={`${selected ? 'Deseleccionar' : 'Seleccionar'} ${name}`}
                >
                  {selected && <span style={styles.chipCheck}>✓</span>}
                  {name}
                </button>
              );
            })}
          </div>

          <div style={styles.chipsActions}>
            <button
              type="button"
              onClick={() => { void handleConfirm(); }}
              disabled={confirming || selectedItems.size === 0}
              style={{
                ...styles.confirmBtn,
                ...(confirming || selectedItems.size === 0 ? styles.confirmBtnDisabled : {}),
              }}
            >
              {confirming ? 'Añadiendo…' : `Añadir ${selectedItems.size === pendingItems.length ? 'todos' : `${selectedItems.size}`}`}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              style={styles.discardBtn}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  btnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  micBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '2px solid var(--color-accent)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  micBtnListening: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  micBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    borderColor: 'var(--color-border)',
  },
  offlineHint: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  interimText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    paddingLeft: 'var(--space-2)',
  },
  errorMsg: {
    fontSize: 'var(--font-size-sm)',
    color: '#c0392b',
    paddingLeft: 'var(--space-2)',
  },
  unsupportedMsg: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  chipsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-accent)',
  },
  chipsLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  chipsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: '999px',
    border: '1.5px solid var(--color-border)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'background-color 0.12s, border-color 0.12s',
  },
  chipSelected: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  chipUnselected: {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-muted)',
  },
  chipCheck: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  chipsActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  confirmBtn: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  discardBtn: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
};
