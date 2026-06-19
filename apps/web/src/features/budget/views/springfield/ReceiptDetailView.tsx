/**
 * ReceiptDetailView — vista presentacional `springfield` (cómic pop) del detalle
 * de un ticket.
 *
 * Misma funcionalidad y mismo contrato (`ReceiptDetailViewProps`) que la vista
 * base: resumen del ticket, listado de artículos, modo edición (mismo editor que
 * la captura, sembrado con los datos del ticket) y borrado. El guardado emite el
 * `CreateReceiptInput` completo. Solo cambia la estética: cabecera amarilla con
 * titular Bangers, pegatina "← Atrás", placa amarilla con el total y artículos
 * separados por línea de puntos discontinua (como la maqueta del kit).
 *
 * Presentacional puro: props in / callbacks out; las mutaciones (PATCH/DELETE)
 * viven en el container.
 */

import { Trash2 } from 'lucide-react';
import { SPEND_CATEGORY_LABELS } from '../../contracts';
import type { ReceiptDetailViewProps } from '../types';
import ReceiptDraftEditor from './ReceiptDraftEditor';

const fmtEUR = (n: number, currency = 'EUR') => {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
};

const fmtLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export default function ReceiptDetailView(props: ReceiptDetailViewProps) {
  const {
    receipt,
    isEditing,
    isSaving,
    isDeleting,
    onBack,
    onToggleEdit,
    onSave,
    onDelete,
  } = props;

  // ── Modo edición: editor a pantalla completa (mismo que la captura) ─────────
  if (isEditing) {
    return (
      <ReceiptDraftEditor
        // `key` por id → se siembra con los valores del ticket al abrir.
        key={`edit-${receipt.id}`}
        draft={{
          merchant: receipt.merchant,
          purchasedAt: receipt.purchasedAt,
          total: receipt.total,
          currency: receipt.currency,
          lines: receipt.lines,
        }}
        isSaving={isSaving}
        title="Editar ticket"
        saveLabel="Guardar cambios"
        onSave={onSave}
        onCancel={onToggleEdit}
      />
    );
  }

  const name = receipt.merchant ?? 'Sin establecimiento';

  return (
    <div className="sf space-y-4 px-5">
      {/* ── Cabecera amarilla de cómic ── */}
      <header className="sf-card-y p-4 relative sf-pop">
        <button type="button" onClick={onBack} className="sf-sticker" aria-label="Volver a tickets">
          ← Tickets
        </button>
        <div className="mt-2 flex items-start justify-between gap-2">
          <h1 className="sf-bangers text-4xl leading-none truncate">{name}</h1>
          {receipt.status === 'draft' && <span className="sf-tag mt-1">Borrador</span>}
        </div>
        <p className="sf-fredoka text-sm mt-1 capitalize">{fmtLongDate(receipt.purchasedAt)}</p>
      </header>

      {/* ── Resumen total (placa amarilla) ── */}
      <div className="sf-card-y p-4 text-center sf-pop">
        <p className="sf-fredoka text-xs uppercase">Total del ticket</p>
        <p className="sf-bangers text-5xl mt-1">{fmtEUR(receipt.total, receipt.currency)}</p>
      </div>

      {/* ── Artículos ── */}
      <section className="space-y-2">
        <h2 className="sf-bangers text-2xl">Artículos ({receipt.lines.length})</h2>
        {receipt.lines.length === 0 ? (
          <p className="sf-fredoka text-sm opacity-70">
            Este ticket no tiene artículos registrados.
          </p>
        ) : (
          <div className="sf-card p-4">
            <ul className="list-none p-0 m-0" aria-label="Artículos del ticket">
              {receipt.lines.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 border-b-2 border-dashed border-border py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="sf-fredoka truncate text-sm">{l.description}</p>
                    <p className="text-xs opacity-60">{SPEND_CATEGORY_LABELS[l.category]}</p>
                  </div>
                  <p className="sf-bangers text-lg whitespace-nowrap">
                    {fmtEUR(l.lineTotal, receipt.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Acciones ── */}
      <div className="flex gap-2">
        <button type="button" className="sf-btn flex-1 text-base" onClick={onToggleEdit}>
          Editar
        </button>
        <button
          type="button"
          className="sf-btn sf-btn-r"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
          {isDeleting ? 'Eliminando…' : 'Borrar'}
        </button>
      </div>
    </div>
  );
}
