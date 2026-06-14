/**
 * ReceiptDetailView — vista presentacional `cozysitcom` (sitcom 70s) del detalle
 * de un ticket.
 *
 * Misma funcionalidad y mismo contrato (`ReceiptDetailViewProps`) que la vista
 * base: resumen del ticket, listado de artículos, modo edición (mismo editor que
 * la captura, sembrado con los datos del ticket) y borrado. El guardado emite el
 * `CreateReceiptInput` completo. Solo cambia la estética.
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
    <div className="cz space-y-4">
      {/* ── Cabecera tipo cintillo de sitcom ── */}
      <header className="cz-pop">
        <button type="button" onClick={onBack} className="mb-2 text-xs font-bold opacity-70">
          ← Tickets
        </button>
        <div className="flex items-end justify-between gap-2">
          <h1 className="cz-serif text-4xl leading-none truncate">{name}</h1>
          {receipt.status === 'draft' ? (
            <span className="cz-stamp">BORRADOR</span>
          ) : (
            <span className="cz-stamp">OK</span>
          )}
        </div>
        <p className="mt-1 text-sm opacity-70">{fmtLongDate(receipt.purchasedAt)}</p>
        <div className="cz-stripe mt-3" />
      </header>

      {/* ── Resumen total (placa denim) ── */}
      <div className="cz-frame cz-pop bg-accent text-text-inverse">
        <p className="text-xs uppercase opacity-70">Total del ticket</p>
        <p className="cz-serif mt-1 text-5xl">{fmtEUR(receipt.total, receipt.currency)}</p>
      </div>

      {/* ── Artículos ── */}
      <section className="space-y-2">
        <h2 className="cz-serif text-xl">Artículos ({receipt.lines.length})</h2>
        {receipt.lines.length === 0 ? (
          <p className="text-sm opacity-70">Este ticket no tiene artículos registrados.</p>
        ) : (
          <div className="cz-frame">
            <ul
              className="divide-y divide-dashed divide-border list-none p-0 m-0"
              aria-label="Artículos del ticket"
            >
              {receipt.lines.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="cz-serif truncate text-sm">{l.description}</p>
                    <p className="text-xs opacity-60">{SPEND_CATEGORY_LABELS[l.category]}</p>
                  </div>
                  <p className="cz-serif whitespace-nowrap">
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
        <button type="button" className="cz-btn-denim flex-1" onClick={onToggleEdit}>
          Editar
        </button>
        <button
          type="button"
          className="cz-btn-garnet"
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
