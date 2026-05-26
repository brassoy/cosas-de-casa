/**
 * Barra de artículos frecuentes de la familia.
 *
 * Muestra los artículos más comprados como chips de "añadir rápido".
 * Un toque en un chip llama directamente a onAdd con el nombre del artículo.
 *
 * Se oculta si no hay artículos frecuentes o si la carga falla.
 */

import type { FrequentItemBarEntry } from '../hooks/useFrequentItems';

interface FrequentItemsBarProps {
  items: FrequentItemBarEntry[];
  loading: boolean;
  onAdd: (name: string) => Promise<void>;
}

export function FrequentItemsBar({ items, loading, onAdd }: FrequentItemsBarProps) {
  if (loading || items.length === 0) return null;

  return (
    <div style={styles.wrapper} role="region" aria-label="Artículos frecuentes">
      <p style={styles.label}>Añadir rápido:</p>
      <div style={styles.chipsList}>
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => { void onAdd(item.name); }}
            style={styles.chip}
            aria-label={`Añadir ${item.name} rápidamente`}
          >
            + {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
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
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: '999px',
    border: '1.5px solid var(--color-accent)',
    backgroundColor: 'transparent',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    transition: 'background-color 0.12s, color 0.12s',
  },
};
