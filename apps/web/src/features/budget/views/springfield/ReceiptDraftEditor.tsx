/**
 * ReceiptDraftEditor — editor presentacional `springfield` (cómic pop) del
 * borrador de un ticket (extraído por OCR, alta manual o edición de uno
 * existente).
 *
 * Misma lógica y mismo contrato (`ReceiptDraftEditorProps`) que la vista base:
 * edita merchant + fecha + divisa + líneas y emite un `CreateReceiptInput`
 * completo al guardar. Solo cambia la estética: cabecera amarilla `sf-card-y`,
 * viñetas `sf-card`, inputs `sf-input` nativos, líneas en tarjetas de papel con
 * borde de tinta y botones físicos `sf-btn-*`.
 *
 * Sub-componente presentacional PURO y props-driven. El estado del formulario es
 * estado de UI local (se siembra con `key` desde el padre al abrir).
 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type {
  CreateReceiptInput,
  ExtractReceiptResponse,
  SpendCategory,
} from '../../contracts';
import { SPEND_CATEGORY_LABELS } from '../../contracts';

export interface ReceiptDraftEditorProps {
  /** Borrador de partida (datos del OCR, vacío para alta manual o ticket en edición). */
  draft: ExtractReceiptResponse;
  /** El guardado está en curso. */
  isSaving?: boolean;
  /** Título del editor (p. ej. "Revisar ticket" o "Editar ticket"). */
  title?: string;
  /** Etiqueta del botón principal (p. ej. "Guardar ticket"). */
  saveLabel?: string;
  /** Emite el `CreateReceiptInput` completo al guardar. */
  onSave: (input: CreateReceiptInput) => void;
  /** Cancela y cierra el editor. */
  onCancel: () => void;
}

type EditableLine = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal: string; // string para el input controlado
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

const fmtEUR = (n: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n);

export default function ReceiptDraftEditor(props: ReceiptDraftEditorProps) {
  const {
    draft,
    isSaving,
    title = 'Revisar ticket',
    saveLabel = 'Guardar ticket',
    onSave,
    onCancel,
  } = props;

  const today = new Date().toISOString().split('T')[0]!;

  const [merchant, setMerchant] = useState(draft.merchant ?? '');
  const [purchasedAt, setPurchasedAt] = useState(draft.purchasedAt?.split('T')[0] ?? today);
  const [currency, setCurrency] = useState(draft.currency ?? 'EUR');
  const [lines, setLines] = useState<EditableLine[]>(toEditable(draft.lines));

  const computedTotal = lines.reduce((acc, l) => acc + (parseFloat(l.lineTotal) || 0), 0);

  function updateLine(idx: number, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { description: '', lineTotal: '0', category: 'groceries' }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

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

  const canSave = purchasedAt.length > 0 && lines.length > 0 && !isSaving;

  return (
    <div className="sf space-y-5" role="main" aria-label="Editor de ticket">
      {/* ── Cabecera amarilla de cómic ── */}
      <header className="sf-card-y p-4 relative sf-pop">
        <h1 className="sf-bangers text-4xl leading-none">{title}</h1>
      </header>

      {/* ── Datos generales ── */}
      <section className="sf-card p-5 space-y-3 sf-pop">
        <h2 className="sf-bangers text-2xl">Datos generales</h2>
        <div className="space-y-1.5">
          <label htmlFor="receipt-merchant" className="sf-fredoka block text-xs uppercase">
            Establecimiento
          </label>
          <input
            id="receipt-merchant"
            className="sf-input"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Nombre del comercio"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="receipt-date" className="sf-fredoka block text-xs uppercase">
              Fecha de compra
            </label>
            <input
              id="receipt-date"
              className="sf-input"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="receipt-currency" className="sf-fredoka block text-xs uppercase">
              Divisa
            </label>
            <select
              id="receipt-currency"
              className="sf-input"
              aria-label="Divisa"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Líneas ── */}
      <section className="sf-card p-5 space-y-3 sf-pop">
        <div className="flex items-center justify-between gap-2">
          <h2 className="sf-bangers text-2xl">Artículos ({lines.length})</h2>
          <button type="button" className="sf-btn !py-1.5 !px-3 text-xs" onClick={addLine}>
            <Plus className="mr-1 inline h-4 w-4" aria-hidden="true" />
            Añadir
          </button>
        </div>

        {lines.length === 0 && (
          <p className="sf-fredoka text-sm opacity-70">No hay artículos. Añade uno manualmente.</p>
        )}

        <ul className="space-y-2 list-none p-0 m-0" aria-label="Artículos del ticket">
          {lines.map((line, idx) => (
            <li key={idx} className="rounded-2xl border-[3px] border-border bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="sf-input flex-[2] min-w-[140px]"
                  value={line.description}
                  onChange={(e) => updateLine(idx, { description: e.target.value })}
                  placeholder="Descripción"
                  aria-label={`Descripción del artículo ${idx + 1}`}
                />
                <input
                  className="sf-input flex-1 min-w-[80px]"
                  type="number"
                  value={line.lineTotal}
                  onChange={(e) => updateLine(idx, { lineTotal: e.target.value })}
                  placeholder="Importe"
                  min={0}
                  step={0.01}
                  aria-label={`Importe del artículo ${idx + 1}`}
                />
                <select
                  className="sf-input flex-1 min-w-[120px]"
                  value={line.category}
                  onChange={(e) => updateLine(idx, { category: e.target.value as SpendCategory })}
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
                  aria-label={`Eliminar artículo ${idx + 1}`}
                  className="shrink-0 grid h-9 w-9 place-items-center rounded-md text-error hover:bg-surface-sunken"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Total calculado ── */}
      <div className="sf-card-y p-4 flex items-center justify-between sf-pop">
        <span className="sf-fredoka text-sm uppercase">Total calculado</span>
        <span className="sf-bangers text-3xl">{fmtEUR(computedTotal, currency)}</span>
      </div>

      {/* ── Acciones ── */}
      <div className="flex gap-2">
        <button
          type="button"
          className="sf-btn sf-btn-g flex-1 text-base"
          onClick={handleSave}
          disabled={!canSave}
        >
          {isSaving ? 'Guardando…' : saveLabel}
        </button>
        <button type="button" className="sf-btn sf-btn-w" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
