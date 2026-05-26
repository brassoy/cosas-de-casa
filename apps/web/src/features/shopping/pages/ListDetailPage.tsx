import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useShoppingListDetail, useToggleItem, useDeleteItem, useAddItemWithDedup } from '../hooks/useShopping';
import { useFrequentItems } from '../hooks/useFrequentItems';
import { useRealtimeItems } from '../hooks/useRealtimeItems';
import { useShoppingStore } from '../store/shopping.store';
import { ItemSheet } from '../components/ItemSheet';
import { VoiceAddButton } from '../components/VoiceAddButton';
import { FrequentItemsBar } from '../components/FrequentItemsBar';
import { DedupConfirmDialog } from '../components/DedupConfirmDialog';
import { AddSuccessOverlay } from '../components/AddSuccessOverlay';
import type { LocalItem } from '../offline/db';

// ── Presentational: fila de ítem ─────────────────────────────────────────────

interface ItemRowProps {
  item: LocalItem;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

function ItemRow({ item, onToggle, onDelete, onOpenDetail }: ItemRowProps) {
  const hasDetail = Boolean(item.description || item.purchaseLink);

  return (
    <li style={styles.itemRow}>
      <button
        type="button"
        onClick={() => onToggle(item.id, !item.checked)}
        style={{ ...styles.checkbox, ...(item.checked ? styles.checkboxChecked : {}) }}
        aria-label={item.checked ? `Marcar ${item.name} como pendiente` : `Marcar ${item.name} como comprado`}
        aria-pressed={item.checked}
      >
        {item.checked && <span style={styles.checkmark}>✓</span>}
      </button>

      <div style={styles.itemContent}>
        <span
          style={{ ...styles.itemName, ...(item.checked ? styles.itemNameChecked : {}) }}
          onClick={() => hasDetail && onOpenDetail(item.id)}
          role={hasDetail ? 'button' : undefined}
          tabIndex={hasDetail ? 0 : undefined}
          onKeyDown={(e) => { if (hasDetail && (e.key === 'Enter' || e.key === ' ')) onOpenDetail(item.id); }}
        >
          {item.name}
        </span>

        {(item.quantity !== undefined || item.unit) && (
          <span style={styles.itemMeta}>
            {item.quantity !== undefined ? String(item.quantity) : ''} {item.unit ?? ''}
          </span>
        )}

        {hasDetail && (
          <button
            type="button"
            onClick={() => onOpenDetail(item.id)}
            style={styles.detailBtn}
            aria-label={`Ver detalle de ${item.name}`}
          >
            Ver detalle
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        style={styles.deleteBtn}
        aria-label={`Eliminar ${item.name}`}
      >
        ✕
      </button>
    </li>
  );
}

// ── Formulario: añadir ítem ───────────────────────────────────────────────────

interface AddItemFormProps {
  listId: string;
  onAdd: (data: { name: string; unit?: string }) => Promise<void>;
}

function AddItemForm({ onAdd }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await onAdd({ name: name.trim(), unit: unit.trim() || undefined });
      setName('');
      setUnit('');
      setExpanded(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} style={styles.addForm}>
      <div style={styles.addRow}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Añadir artículo…"
          style={styles.addInput}
          aria-label="Nombre del artículo"
          maxLength={200}
          onFocus={() => setExpanded(true)}
        />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          style={styles.addBtn}
        >
          {adding ? '…' : 'Añadir'}
        </button>
      </div>

      {expanded && (
        <div style={styles.addExtra}>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidad (opcional, p. ej. kg, l, uds)"
            style={styles.addInput}
            aria-label="Unidad"
            maxLength={50}
          />
        </div>
      )}
    </form>
  );
}

// ── Sección de acciones de añadir (texto + voz + frecuentes) ─────────────────

interface AddSectionProps {
  listId: string;
  familyId: string;
  onAdd: (data: { name: string; unit?: string }) => Promise<void>;
  onAddByVoice: (names: string[]) => Promise<void>;
}

function AddSection({ listId, familyId, onAdd, onAddByVoice }: AddSectionProps) {
  const { items: frequentItems, loading: loadingFrequent } = useFrequentItems(familyId);

  return (
    <div style={styles.addSection}>
      <AddItemForm listId={listId} onAdd={onAdd} />
      <div style={styles.addSectionRow}>
        <VoiceAddButton onAddItems={onAddByVoice} />
      </div>
      <FrequentItemsBar
        items={frequentItems}
        loading={loadingFrequent}
        onAdd={(name) => onAdd({ name })}
      />
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function ListDetailPage() {
  const { listId, familyId } = useParams({ strict: false }) as {
    listId: string;
    familyId: string;
  };
  const navigate = useNavigate();
  const { list, items, loading } = useShoppingListDetail(listId);
  const { toggleItem } = useToggleItem();
  const { deleteItem } = useDeleteItem();
  const {
    addItemWithDedup,
    dedupState,
    confirmDedup,
    cancelDedup,
    autoMergeMessage,
    showSuccessOverlay,
    successCount,
    hideSuccessOverlay,
  } = useAddItemWithDedup();

  // Suscripción Realtime: mergea cambios remotos en Dexie; useLiveQuery repinta.
  useRealtimeItems(listId);
  const openItemId = useShoppingStore((s) => s.openItemId);
  const openItem = useShoppingStore((s) => s.openItem);
  const closeItem = useShoppingStore((s) => s.closeItem);

  const openItemData = openItemId ? items.find((i) => i.id === openItemId) ?? null : null;

  const pending = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  async function handleAdd(data: { name: string; unit?: string }) {
    await addItemWithDedup(listId, data);
  }

  async function handleAddByVoice(names: string[]) {
    for (const name of names) {
      await addItemWithDedup(listId, { name });
    }
  }

  if (!list && !loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Lista no encontrada.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Cabecera */}
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() => void navigate({ to: '/family/$familyId/lists', params: { familyId } })}
          style={styles.backBtn}
          aria-label="Volver a listas"
        >
          ‹ Listas
        </button>
        <h2 style={styles.pageTitle}>{list?.name ?? '…'}</h2>
      </header>

      {/* Sección de añadir: texto + voz + frecuentes */}
      <AddSection
        listId={listId}
        familyId={familyId}
        onAdd={handleAdd}
        onAddByVoice={handleAddByVoice}
      />

      {/* Feedback de fusión automática */}
      {autoMergeMessage && (
        <p style={styles.autoMergeToast} role="status" aria-live="polite">
          {autoMergeMessage}
        </p>
      )}

      {/* Estado cargando */}
      {loading && <p style={styles.muted}>Cargando artículos…</p>}

      {/* Lista pendiente */}
      {pending.length > 0 && (
        <section>
          <p style={styles.sectionLabel}>Por comprar ({pending.length})</p>
          <ul style={styles.itemList}>
            {pending.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={(id, ch) => { void toggleItem(id, ch); }}
                onDelete={(id) => { void deleteItem(id); }}
                onOpenDetail={openItem}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Lista comprada */}
      {checked.length > 0 && (
        <section>
          <p style={styles.sectionLabel}>Comprado ({checked.length})</p>
          <ul style={styles.itemList}>
            {checked.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={(id, ch) => { void toggleItem(id, ch); }}
                onDelete={(id) => { void deleteItem(id); }}
                onOpenDetail={openItem}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Estado vacío */}
      {!loading && items.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>La lista está vacía. ¡Añade el primer artículo!</p>
        </div>
      )}

      {/* Sheet de detalle */}
      {openItemData && (
        <ItemSheet item={openItemData} onClose={closeItem} />
      )}

      {/* Diálogo de confirmación de dedup */}
      {dedupState && (
        <DedupConfirmDialog
          existingName={dedupState.existingName}
          newItemName={dedupState.itemData.name}
          onConfirm={confirmDedup}
          onCancel={cancelDedup}
        />
      )}

      {/* Overlay festivo al añadir un ítem. `key` fuerza re-mount para obtener frase/gif nuevos. */}
      <AddSuccessOverlay
        key={successCount}
        visible={showSuccessOverlay}
        onClose={hideSuccessOverlay}
      />
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
    gap: 'var(--space-5)',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-base)',
    padding: 0,
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  addSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  addSectionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  autoMergeToast: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  addRow: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  addExtra: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  addInput: {
    flex: 1,
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  addBtn: {
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-base)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 'var(--space-2)',
  },
  itemList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  checkbox: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-sm)',
    border: '2px solid var(--color-border)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
  },
  checkmark: {
    color: 'var(--color-text-inverse)',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  itemName: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemNameChecked: {
    textDecoration: 'line-through',
    color: 'var(--color-text-muted)',
  },
  itemMeta: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  detailBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    alignSelf: 'flex-start',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    padding: 'var(--space-1)',
    flexShrink: 0,
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
};
