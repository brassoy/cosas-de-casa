import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useShoppingLists, useCreateList } from '../hooks/useShopping';

// ── Presentational: tarjeta de lista ─────────────────────────────────────────

interface ListCardProps {
  id: string;
  name: string;
  familyId: string;
  isMain?: boolean;
  onNavigate: () => void;
}

function ListCard({ name, isMain, onNavigate }: ListCardProps) {
  return (
    <li style={{ ...styles.card, ...(isMain ? styles.cardMain : {}) }}>
      <button type="button" onClick={onNavigate} style={styles.cardBtn}>
        <div style={styles.cardContent}>
          <span style={styles.cardIcon}>{isMain ? '🏠' : '📋'}</span>
          <div>
            <p style={styles.cardName}>{name}</p>
            {isMain && (
              <p style={styles.cardBadge}>Lista principal</p>
            )}
          </div>
        </div>
        <span style={styles.chevron}>›</span>
      </button>
    </li>
  );
}

// ── Modal: crear lista ────────────────────────────────────────────────────────

interface CreateListModalProps {
  onClose: () => void;
  onConfirm: (name: string) => void;
  loading: boolean;
}

function CreateListModal({ onClose, onConfirm, loading }: CreateListModalProps) {
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) onConfirm(name.trim());
  }

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Crear lista">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Nueva lista</h2>
        <form onSubmit={handleSubmit} style={styles.modalForm}>
          <label style={styles.formLabel} htmlFor="list-name">
            Nombre de la lista
          </label>
          <input
            id="list-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Vacaciones, Mercado semanal…"
            style={styles.input}
            autoFocus
            maxLength={100}
            required
          />
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={styles.btnPrimary}
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function ListsPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const { lists, loading } = useShoppingLists(activeFamily?.id);
  const { createList } = useCreateList();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate(name: string) {
    if (!activeFamily) return;
    setCreating(true);
    try {
      await createList(activeFamily.id, name);
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  // La lista MAIN la identifica su `type`, no su posición en el array.
  const mainList = lists.find((l) => l.type === 'MAIN') ?? null;
  const otherLists = lists.filter((l) => l.type !== 'MAIN');

  if (!activeFamily) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Listas de la compra</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={styles.btnPrimary}
          aria-label="Crear lista"
        >
          + Crear lista
        </button>
      </header>

      {loading && <p style={styles.muted}>Cargando listas…</p>}

      {!loading && lists.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>Aún no hay ninguna lista.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={styles.btnPrimary}
          >
            Crear mi primera lista
          </button>
        </div>
      )}

      {lists.length > 0 && (
        <ul style={styles.list}>
          {mainList && (
            <ListCard
              id={mainList.id}
              name={mainList.name}
              familyId={mainList.familyId}
              isMain
              onNavigate={() =>
                void navigate({
                  to: '/family/$familyId/lists/$listId',
                  params: { familyId: activeFamily.id, listId: mainList.id },
                })
              }
            />
          )}
          {otherLists.map((l) => (
            <ListCard
              key={l.id}
              id={l.id}
              name={l.name}
              familyId={l.familyId}
              onNavigate={() =>
                void navigate({
                  to: '/family/$familyId/lists/$listId',
                  params: { familyId: activeFamily.id, listId: l.id },
                })
              }
            />
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateListModal
          onClose={() => setShowCreate(false)}
          onConfirm={(name) => { void handleCreate(name); }}
          loading={creating}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  card: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    backgroundColor: 'var(--color-surface-raised)',
    overflow: 'hidden',
  },
  cardMain: {
    borderColor: 'var(--color-accent)',
    borderWidth: '2px',
  },
  cardBtn: {
    width: '100%',
    padding: 'var(--space-4)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left',
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  cardIcon: {
    fontSize: '1.5rem',
  },
  cardName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  cardBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-accent)',
    fontWeight: 'var(--font-weight-semibold)',
    marginTop: '2px',
  },
  chevron: {
    fontSize: 'var(--font-size-xl)',
    color: 'var(--color-text-muted)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-12) 0',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-base)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 'var(--space-4)',
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.3))',
  },
  modalTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  formLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  input: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  modalActions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
  },
};
