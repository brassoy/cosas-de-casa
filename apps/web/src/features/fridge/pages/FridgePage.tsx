import { useState } from 'react';
import { useFamilyStore } from '@/features/family/store/family.store';
import {
  useFamilyFridge,
  useEatFridgeItem,
  useThrowFridgeItem,
  useFreezeFridgeItem,
  useDeleteFridgeItem,
} from '../hooks/useFridge';
import { useFridgeStore } from '../store/fridge.store';
import { AddFridgeItemModal } from '../components/AddFridgeItemModal';
import { EditFridgeItemModal } from '../components/EditFridgeItemModal';
import {
  FRIDGE_LOCATION_LABELS,
  getExpiryUrgency,
  urgencyColor,
  urgencyLabel,
} from '../types';
import type { FridgeItemDto, FridgeLocation } from '../types';

// ── Presentational: tarjeta de ítem ──────────────────────────────────────────

interface FridgeItemCardProps {
  item: FridgeItemDto;
  familyId: string;
  onEdit: () => void;
}

function FridgeItemCard({ item, familyId, onEdit }: FridgeItemCardProps) {
  const urgency = getExpiryUrgency(item.expiryDate);
  const color = urgencyColor(urgency);
  const label = urgencyLabel(urgency, item.expiryDate);

  const eat = useEatFridgeItem(item.id, familyId);
  const throwItem = useThrowFridgeItem(item.id, familyId);
  const freeze = useFreezeFridgeItem(item.id, familyId);
  const del = useDeleteFridgeItem(item.id, familyId);

  const isBusy = eat.isPending || throwItem.isPending || freeze.isPending || del.isPending;

  return (
    <li
      style={{
        ...styles.card,
        borderLeftColor: color,
      }}
      data-urgency={urgency}
    >
      <div style={styles.cardTop}>
        <div style={styles.cardMain}>
          <span style={styles.cardName}>{item.name}</span>
          {(item.quantity != null || item.unit) && (
            <span style={styles.cardQty}>
              {item.quantity != null ? Number(item.quantity) : ''}{item.unit ? ` ${item.unit}` : ''}
            </span>
          )}
        </div>
        {label ? (
          <span style={{ ...styles.expiryBadge, color, borderColor: color }}>
            {label}
          </span>
        ) : null}
      </div>

      <div style={styles.cardActions}>
        <button
          type="button"
          onClick={() => eat.mutate()}
          disabled={isBusy}
          style={styles.actionBtn}
          aria-label={`Marcar ${item.name} como consumido`}
          title="Comer"
        >
          🍽️ Comer
        </button>
        <button
          type="button"
          onClick={() => throwItem.mutate()}
          disabled={isBusy}
          style={styles.actionBtn}
          aria-label={`Tirar ${item.name}`}
          title="Tirar"
        >
          🗑️ Tirar
        </button>
        {item.location !== 'FREEZER' && (
          <button
            type="button"
            onClick={() => freeze.mutate()}
            disabled={isBusy}
            style={styles.actionBtn}
            aria-label={`Congelar ${item.name}`}
            title="Congelar"
          >
            🧊 Congelar
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          disabled={isBusy}
          style={styles.actionBtn}
          aria-label={`Editar ${item.name}`}
          title="Editar"
        >
          ✏️ Editar
        </button>
        <button
          type="button"
          onClick={() => del.mutate()}
          disabled={isBusy}
          style={{ ...styles.actionBtn, color: 'var(--color-error)' }}
          aria-label={`Eliminar ${item.name}`}
          title="Eliminar"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

// ── Presentational: sección por ubicación ────────────────────────────────────

interface LocationSectionProps {
  location: FridgeLocation;
  items: FridgeItemDto[];
  familyId: string;
  onEdit: (item: FridgeItemDto) => void;
}

function LocationSection({ location, items, familyId, onEdit }: LocationSectionProps) {
  if (items.length === 0) return null;

  return (
    <section style={styles.section} aria-label={FRIDGE_LOCATION_LABELS[location]}>
      <h3 style={styles.sectionTitle}>
        {locationIcon(location)} {FRIDGE_LOCATION_LABELS[location]}{' '}
        <span style={styles.count}>({items.length})</span>
      </h3>
      <ul style={styles.itemList}>
        {items.map((item) => (
          <FridgeItemCard
            key={item.id}
            item={item}
            familyId={familyId}
            onEdit={() => onEdit(item)}
          />
        ))}
      </ul>
    </section>
  );
}

function locationIcon(loc: FridgeLocation): string {
  switch (loc) {
    case 'FRIDGE': return '❄️';
    case 'FREEZER': return '🧊';
    case 'PANTRY': return '🥫';
  }
}

// ── Presentational: sección "Consumir primero" ────────────────────────────────

interface ConsumeFirstProps {
  items: FridgeItemDto[];
  familyId: string;
  onEdit: (item: FridgeItemDto) => void;
}

function ConsumeFirstSection({ items, familyId, onEdit }: ConsumeFirstProps) {
  if (items.length === 0) return null;

  return (
    <section
      style={styles.consumeFirstSection}
      aria-label="Consumir primero"
    >
      <h3 style={styles.consumeFirstTitle}>
        ⚠️ Consumir primero
      </h3>
      <ul style={styles.itemList}>
        {items.map((item) => (
          <FridgeItemCard
            key={item.id}
            item={item}
            familyId={familyId}
            onEdit={() => onEdit(item)}
          />
        ))}
      </ul>
    </section>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

/** Ordena los ítems por caducidad: sin fecha al final, los que antes caducan primero. */
function sortByExpiry(items: FridgeItemDto[]): FridgeItemDto[] {
  return [...items].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });
}

const LOCATION_ORDER: FridgeLocation[] = ['FRIDGE', 'FREEZER', 'PANTRY'];

export function FridgePage() {
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const { data: allItems = [], isLoading, error } = useFamilyFridge(activeFamily?.id);

  const locationFilter = useFridgeStore((s) => s.filters.location);
  const setLocationFilter = useFridgeStore((s) => s.setLocationFilter);

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeItemDto | null>(null);

  const sorted = sortByExpiry(allItems);

  // Ítems urgentes: caducados o que caducan hoy/mañana/pasado
  const urgentItems = sorted.filter((i) => {
    const u = getExpiryUrgency(i.expiryDate);
    return u === 'expired' || u === 'warning';
  });

  // Filtrado por ubicación
  const filtered =
    locationFilter === 'ALL' ? sorted : sorted.filter((i) => i.location === locationFilter);

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
        <h2 style={styles.pageTitle}>🧊 Nevera</h2>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={styles.btnPrimary}
          aria-label="Añadir producto"
        >
          + Añadir
        </button>
      </header>

      {/* Filtro por ubicación */}
      <div style={styles.filterRow} role="group" aria-label="Filtrar por ubicación">
        <button
          type="button"
          onClick={() => setLocationFilter('ALL')}
          style={{
            ...styles.filterChip,
            ...(locationFilter === 'ALL' ? styles.filterChipActive : {}),
          }}
          aria-pressed={locationFilter === 'ALL'}
        >
          Todo
        </button>
        {LOCATION_ORDER.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setLocationFilter(loc)}
            style={{
              ...styles.filterChip,
              ...(locationFilter === loc ? styles.filterChipActive : {}),
            }}
            aria-pressed={locationFilter === loc}
          >
            {locationIcon(loc)} {FRIDGE_LOCATION_LABELS[loc]}
          </button>
        ))}
      </div>

      {isLoading && <p style={styles.muted}>Cargando inventario…</p>}

      {error && (
        <p role="alert" style={styles.errorBanner}>
          No se ha podido cargar el inventario.
        </p>
      )}

      {!isLoading && !error && allItems.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>La despensa está vacía. ¡Añade tu primer producto!</p>
          <button type="button" onClick={() => setShowAdd(true)} style={styles.btnPrimary}>
            Añadir primer producto
          </button>
        </div>
      )}

      {!isLoading && !error && allItems.length > 0 && (
        <>
          {/* Sección urgente — siempre visible si hay ítems urgentes, independiente del filtro */}
          {urgentItems.length > 0 && locationFilter === 'ALL' && (
            <ConsumeFirstSection
              items={urgentItems}
              familyId={activeFamily.id}
              onEdit={(item) => setEditingItem(item)}
            />
          )}

          {filtered.length === 0 && (
            <p style={styles.muted}>Ningún producto en esta ubicación.</p>
          )}

          {/* Secciones por ubicación */}
          {locationFilter === 'ALL'
            ? LOCATION_ORDER.map((loc) => (
                <LocationSection
                  key={loc}
                  location={loc}
                  items={sorted.filter((i) => i.location === loc)}
                  familyId={activeFamily.id}
                  onEdit={(item) => setEditingItem(item)}
                />
              ))
            : filtered.length > 0 && (
                <ul style={styles.itemList}>
                  {filtered.map((item) => (
                    <FridgeItemCard
                      key={item.id}
                      item={item}
                      familyId={activeFamily.id}
                      onEdit={() => setEditingItem(item)}
                    />
                  ))}
                </ul>
              )}
        </>
      )}

      {showAdd && (
        <AddFridgeItemModal
          familyId={activeFamily.id}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingItem && (
        <EditFridgeItemModal
          familyId={activeFamily.id}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

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
  filterRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  filterChip: {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  filterChipActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  count: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-normal)',
    color: 'var(--color-text-muted)',
  },
  consumeFirstSection: {
    backgroundColor: 'rgba(220,38,38,0.06)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  consumeFirstTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-error)',
  },
  itemList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  card: {
    border: '1px solid var(--color-border)',
    borderLeftWidth: '4px',
    borderRadius: 'var(--radius-card)',
    backgroundColor: 'var(--color-surface-raised)',
    padding: 'var(--space-3) var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
  },
  cardName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  cardQty: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  expiryBadge: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '2px var(--space-2)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '2px var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
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
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
