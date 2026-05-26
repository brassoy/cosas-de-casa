/**
 * Diálogo de confirmación para el caso de deduplicación SUGGEST.
 *
 * Cuando el backend decide que un artículo nuevo es similar a uno existente,
 * devuelve `decision: 'SUGGEST'` con la lista de candidatos similares.
 * Este componente pregunta al usuario si quiere añadirlo igualmente.
 *
 * Supuesto de API (response del POST /lists/:id/items cuando hay dedup):
 *   {
 *     decision: 'ADD_NEW' | 'AUTO_MERGE' | 'SUGGEST',
 *     item?: ShoppingItemDto,        // ítem creado (ADD_NEW / AUTO_MERGE)
 *     candidates?: { id: string; name: string }[]  // similares (SUGGEST)
 *   }
 *
 * El componente recibe:
 *   - candidateName: nombre del artículo ya existente más parecido
 *   - newItemName: nombre del artículo que el usuario quiere añadir
 *   - onConfirm: callback para añadir igualmente (force add)
 *   - onCancel: callback para descartar
 */

interface DedupConfirmDialogProps {
  existingName: string;
  newItemName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DedupConfirmDialog({
  existingName,
  newItemName,
  onConfirm,
  onCancel,
}: DedupConfirmDialogProps) {
  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Artículo similar encontrado"
      onClick={onCancel}
    >
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <p style={styles.title}>Artículo similar</p>
        <p style={styles.message}>
          Ya tienes{' '}
          <strong>"{existingName}"</strong> en la lista.
          {newItemName !== existingName && (
            <>
              {' '}¿Quieres añadir{' '}
              <strong>"{newItemName}"</strong> igualmente?
            </>
          )}
          {newItemName === existingName && ' ¿Lo añades igualmente?'}
        </p>
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => { void onConfirm(); }}
            style={styles.confirmBtn}
          >
            Añadir igualmente
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelBtn}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 'var(--space-4)',
  },
  dialog: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    maxWidth: '380px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
    margin: 0,
  },
  message: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text)',
    lineHeight: 1.5,
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  confirmBtn: {
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-base)',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-base)',
    cursor: 'pointer',
  },
};
