/**
 * Hoja lateral (sheet) con el detalle de un ítem de la lista.
 * Muestra descripción, enlace de compra y hilo de comentarios.
 */

import { useState } from 'react';
import type { LocalItem } from '../offline/db';
import { useItemComments, useAddComment } from '../hooks/useShopping';
import { useAuthStore } from '@/features/auth/store/auth.store';

interface ItemSheetProps {
  item: LocalItem;
  onClose: () => void;
}

export function ItemSheet({ item, onClose }: ItemSheetProps) {
  const user = useAuthStore((s) => s.user);
  const { comments } = useItemComments(item.id);
  const { addComment } = useAddComment(item.id);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !user) return;
    setSending(true);
    try {
      await addComment(
        body.trim(),
        user.id,
        user.user_metadata?.['display_name'] as string ?? user.email ?? 'Usuario',
      );
      setBody('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Detalle de ${item.name}`}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={styles.header}>
          <h2 style={styles.title}>{item.name}</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Detalle del ítem */}
        {item.description && (
          <section style={styles.section}>
            <p style={styles.label}>Descripción</p>
            <p style={styles.text}>{item.description}</p>
          </section>
        )}

        {item.purchaseLink && (
          <section style={styles.section}>
            <p style={styles.label}>Enlace de compra</p>
            <a
              href={item.purchaseLink}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              Ver producto
            </a>
          </section>
        )}

        {/* Metadatos */}
        {(item.quantity !== undefined || item.unit) && (
          <section style={styles.section}>
            <p style={styles.label}>Cantidad</p>
            <p style={styles.text}>
              {item.quantity !== undefined ? String(item.quantity) : ''}{' '}
              {item.unit ?? ''}
            </p>
          </section>
        )}

        {/* Hilo de comentarios */}
        <section style={styles.section}>
          <p style={styles.label}>Comentarios ({comments.length})</p>

          <ul style={styles.commentList}>
            {comments.map((c) => (
              <li key={c.id} style={styles.commentItem}>
                <span style={styles.commentAuthor}>{c.authorName}</span>
                <span style={styles.commentTime}>
                  {new Date(c.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <p style={styles.commentBody}>{c.body}</p>
              </li>
            ))}
            {comments.length === 0 && (
              <li style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Sin comentarios aún.
              </li>
            )}
          </ul>

          <form onSubmit={(e) => { void handleSubmit(e); }} style={styles.commentForm}>
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Añade un comentario..."
              style={styles.commentInput}
              aria-label="Nuevo comentario"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              style={styles.submitBtn}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
  },
  sheet: {
    width: '100%',
    maxWidth: '640px',
    maxHeight: '80dvh',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
    padding: 'var(--space-6)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-lg)',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    padding: 'var(--space-1)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  text: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text)',
  },
  link: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-accent)',
    textDecoration: 'underline',
  },
  commentList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  commentItem: {
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    border: '1px solid var(--color-border)',
  },
  commentAuthor: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  commentTime: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  commentBody: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    marginTop: 'var(--space-1)',
  },
  commentForm: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  commentInput: {
    flex: 1,
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
  },
  submitBtn: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
};
