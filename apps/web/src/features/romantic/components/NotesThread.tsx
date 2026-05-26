/**
 * NotesThread — hilo de mensajes entre la pareja.
 *
 * Forma real de la nota (CoupleNoteDto):
 *   { id, coupleId, authorId, body, createdAt }
 *
 * Añadir nota: POST /couples/:coupleId/notes  body: { body }
 */

import { useState, useRef, useEffect } from 'react';
import { useCoupleNotes, useAddNote } from '../hooks/useRomantic';

interface Props {
  coupleId: string;
  currentUserId: string;
}

export function NotesThread({ coupleId, currentUserId }: Props) {
  const { data: notes, isLoading, error } = useCoupleNotes(coupleId);
  const addNote = useAddNote(coupleId);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje cuando llegan notas nuevas
  // scrollIntoView puede no existir en entornos de test (jsdom)
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes?.length]);

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setAddError(null);

    addNote.mutate(
      { body },
      {
        onSuccess: () => setDraft(''),
        onError: () => setAddError('No se ha podido enviar la nota. Inténtalo de nuevo.'),
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter o Cmd+Enter para enviar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  if (isLoading) {
    return <p style={styles.muted}>Cargando notas…</p>;
  }

  if (error) {
    return (
      <p role="alert" style={styles.errorBanner}>
        No se han podido cargar las notas.
      </p>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* ── Hilo de mensajes ── */}
      <div style={styles.thread} aria-label="Hilo de notas de pareja">
        {(!notes || notes.length === 0) && (
          <div style={styles.empty}>
            <span style={styles.emptyEmoji}>💌</span>
            <p style={styles.emptyText}>Aún no hay notas. ¡Escríbele algo bonito!</p>
          </div>
        )}

        {notes?.map((note) => {
          const isMine = note.authorId === currentUserId;
          return (
            <div
              key={note.id}
              style={{
                ...styles.bubble,
                ...(isMine ? styles.bubbleMine : styles.bubbleTheirs),
              }}
            >
              <p style={styles.noteContent}>{note.body}</p>
              <time
                dateTime={note.createdAt}
                style={styles.noteTime}
                title={new Date(note.createdAt).toLocaleString('es-ES')}
              >
                {new Date(note.createdAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          );
        })}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* ── Composer ── */}
      <div style={styles.composer}>
        {addError && (
          <p role="alert" style={styles.addError}>
            {addError}
          </p>
        )}

        <div style={styles.composerRow}>
          <label htmlFor="note-input" style={styles.srOnly}>
            Escribe una nota para tu pareja
          </label>
          <textarea
            id="note-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe algo bonito… (Ctrl+Enter para enviar)"
            rows={2}
            style={styles.textarea}
            aria-label="Escribe una nota para tu pareja"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || addNote.isPending}
            style={{
              ...styles.sendBtn,
              ...(!draft.trim() || addNote.isPending ? styles.sendBtnDisabled : {}),
            }}
            aria-label="Enviar nota"
          >
            {addNote.isPending ? '…' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    height: '100%',
  },
  thread: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    overflowY: 'auto',
    maxHeight: '400px',
    padding: 'var(--space-2)',
  },
  bubble: {
    maxWidth: '75%',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    borderBottomRightRadius: 'var(--radius-sm)',
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    borderBottomLeftRadius: 'var(--radius-sm)',
  },
  noteContent: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
  },
  noteTime: {
    fontSize: 'var(--font-size-xs)',
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: '2.5rem',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  composer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-4)',
  },
  composerRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 'var(--space-2)',
  },
  textarea: {
    flex: 1,
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-base)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all var(--transition-fast)',
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  addError: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-error)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
};
