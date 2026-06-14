/**
 * ReceiptDetailView — vista presentacional `cozy` (cuaderno manuscrito) del
 * detalle de un ticket.
 *
 * Misma funcionalidad y mismo contrato (`ReceiptDetailViewProps`) que la vista
 * base: resumen del ticket, lista de artículos, modo edición a pantalla completa
 * (reutiliza `ReceiptDraftEditor`) y borrado. Solo cambia la estética: cabecera
 * manuscrita con sello `ck-stamp` de estado, hoja `ck-card` con cinta `ck-tape`,
 * artículos en líneas de puntos y botones pill `ck-btn-*`.
 *
 * En modo edición reutiliza el mismo `ReceiptDraftEditor` que la captura,
 * sembrado con los datos del ticket. Presentacional puro: props in / callbacks
 * out; las mutaciones (PATCH/DELETE) viven en el container.
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
  const isDraft = receipt.status === 'draft';

  return (
    <div className="ck space-y-4">
      {/* ── Cabecera manuscrita con sello de estado ── */}
      <header className="text-center relative mb-2">
        <button
          type="button"
          onClick={onBack}
          className="ck-marker text-xl text-accent absolute left-0 top-1"
        >
          ← volver
        </button>
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <h1 className="ck-marker text-4xl leading-none mt-1 text-accent truncate">{name}</h1>
        <p className="text-base mt-1 opacity-80">{fmtLongDate(receipt.purchasedAt)}</p>
        <span className="ck-stamp mt-2 inline-block">{isDraft ? 'BORRADOR' : 'OK'}</span>
      </header>

      {/* ── Hoja con artículos y total ── */}
      <section className="ck-card p-4">
        <span className="ck-tape" aria-hidden="true" />
        <p className="ck-marker text-4xl text-center mb-3 text-error">
          {fmtEUR(receipt.total, receipt.currency)}
        </p>

        <h2 className="ck-marker text-2xl text-accent mb-2">
          artículos ({receipt.lines.length})
        </h2>

        {receipt.lines.length === 0 ? (
          <p className="text-base opacity-70">Este ticket no tiene artículos registrados.</p>
        ) : (
          <ul className="space-y-1 list-none p-0 m-0" aria-label="Artículos del ticket">
            {receipt.lines.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-dashed border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base truncate">{l.description}</p>
                  <p className="text-xs opacity-60">{SPEND_CATEGORY_LABELS[l.category]}</p>
                </div>
                <p className="ck-marker text-xl whitespace-nowrap">
                  {fmtEUR(l.lineTotal, receipt.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Acciones ── */}
      <div className="flex gap-3">
        <button type="button" className="ck-btn ck-btn-blue flex-1" onClick={onToggleEdit}>
          Editar
        </button>
        <button
          type="button"
          className="ck-btn ck-btn-red"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="mr-1 inline h-4 w-4" aria-hidden="true" />
          {isDeleting ? 'Borrando…' : 'Borrar'}
        </button>
      </div>
    </div>
  );
}
