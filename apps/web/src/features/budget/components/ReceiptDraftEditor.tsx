/**
 * ReceiptDraftEditor — borrador editable de un ticket extraído por OCR o manual.
 *
 * El usuario puede editar: merchant, purchasedAt, cada línea (descripción, precio,
 * categoría) y añadir/eliminar líneas. Al guardar se emite CreateReceiptInput.
 */

import { useState } from 'react';
import type { CreateReceiptInput, ExtractReceiptResponse, SpendCategory } from '../contracts';
import { SPEND_CATEGORY_LABELS } from '../contracts';

interface Props {
  draft: ExtractReceiptResponse;
  isSaving: boolean;
  onSave: (input: CreateReceiptInput) => void;
  onCancel: () => void;
}

type EditableLine = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal: string; // string para el input
  category: SpendCategory;
};

function toEditable(lines: ExtractReceiptResponse['lines']): EditableLine[] {
  return lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: String(l.lineTotal ?? 0),
    category: l.category ?? 'other',
  }));
}

export function ReceiptDraftEditor({ draft, isSaving, onSave, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]!;

  const [merchant, setMerchant] = useState(draft.merchant ?? '');
  const [purchasedAt, setPurchasedAt] = useState(draft.purchasedAt?.split('T')[0] ?? today);
  const [currency, setCurrency] = useState(draft.currency ?? 'EUR');
  const [lines, setLines] = useState<EditableLine[]>(toEditable(draft.lines));

  const computedTotal = lines.reduce((acc, l) => acc + (parseFloat(l.lineTotal) || 0), 0);

  // ── Líneas ────────────────────────────────────────────────────────────────────

  function updateLine(idx: number, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { description: '', lineTotal: '0', category: 'groceries' },
    ]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Guardar ───────────────────────────────────────────────────────────────────

  function handleSave() {
    const input: CreateReceiptInput = {
      merchant: merchant.trim() || undefined,
      purchasedAt,
      total: computedTotal,
      currency,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: parseFloat(l.lineTotal) || 0,
        category: l.category,
      })),
    };
    onSave(input);
  }

  const canSave = purchasedAt.length > 0 && lines.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page} role="main" aria-label="Editor de ticket">
      <header style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Revisar ticket</h2>
        <div style={styles.headerActions}>
          <button type="button" onClick={onCancel} style={styles.btnGhost}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={styles.btnPrimary}
            disabled={!canSave || isSaving}
          >
            {isSaving ? 'Guardando…' : 'Guardar ticket'}
          </button>
        </div>
      </header>

      <div style={styles.form}>
        {/* ── Datos generales ────────────────────────────────────────── */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Datos generales</h3>
          <div style={styles.row}>
            <label style={styles.label} htmlFor="merchant">
              Establecimiento
            </label>
            <input
              id="merchant"
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Nombre del comercio"
              style={styles.input}
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label} htmlFor="purchased-at">
              Fecha de compra
            </label>
            <input
              id="purchased-at"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label} htmlFor="currency">
              Divisa
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={styles.input}
            >
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
            </select>
          </div>
        </section>

        {/* ── Líneas ────────────────────────────────────────────────── */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              Artículos ({lines.length})
            </h3>
            <button type="button" onClick={addLine} style={styles.btnSecondary}>
              + Añadir artículo
            </button>
          </div>

          {lines.length === 0 && (
            <p style={styles.muted}>No hay artículos. Añade uno manualmente.</p>
          )}

          <ul style={styles.lineList} aria-label="Artículos del ticket">
            {lines.map((line, idx) => (
              <li key={idx} style={styles.lineItem}>
                <div style={styles.lineInputsRow}>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    placeholder="Descripción"
                    style={{ ...styles.input, flex: 2 }}
                    aria-label={`Descripción del artículo ${idx + 1}`}
                  />
                  <input
                    type="number"
                    value={line.lineTotal}
                    onChange={(e) => updateLine(idx, { lineTotal: e.target.value })}
                    placeholder="Importe"
                    min={0}
                    step={0.01}
                    style={{ ...styles.input, flex: 1, minWidth: '80px' }}
                    aria-label={`Importe del artículo ${idx + 1}`}
                  />
                  <select
                    value={line.category}
                    onChange={(e) =>
                      updateLine(idx, { category: e.target.value as SpendCategory })
                    }
                    style={{ ...styles.input, flex: 1, minWidth: '110px' }}
                    aria-label={`Categoría del artículo ${idx + 1}`}
                  >
                    {(Object.keys(SPEND_CATEGORY_LABELS) as SpendCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {SPEND_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    style={styles.removeLine}
                    aria-label={`Eliminar artículo ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Total calculado ────────────────────────────────────────── */}
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total calculado</span>
          <span style={styles.totalAmount}>
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(computedTotal)}
          </span>
        </div>
      </div>
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
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-2)',
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
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  btnGhost: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-8)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-muted)',
  },
  input: {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
  },
  lineList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  lineItem: {
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
  },
  lineInputsRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  removeLine: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-lg)',
    padding: '0 var(--space-1)',
    lineHeight: 1,
    flexShrink: 0,
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '2px solid var(--color-border)',
    paddingTop: 'var(--space-4)',
  },
  totalLabel: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  totalAmount: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
};
