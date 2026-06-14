/**
 * ReceiptDetailView — vista presentacional `base` (shadcn) del detalle de un
 * ticket.
 *
 * Porta el JSX del componente base del kit (Lovable `ReceiptDetailPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con `ReceiptDto`
 * real y AMPLIANDO el guardado: el editor emite el `CreateReceiptInput` completo
 * (merchant + fecha + divisa + líneas), no solo las líneas como en el kit.
 *
 * En modo edición reutiliza el mismo `ReceiptDraftEditor` que la captura,
 * sembrado con los datos del ticket. Presentacional puro: props in / callbacks
 * out; las mutaciones (PATCH/DELETE) viven en el container.
 */

import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground">
          ‹ Tickets
        </button>
        <Button size="sm" variant="outline" onClick={onToggleEdit}>
          Editar
        </Button>
      </div>

      {/* ── Resumen ── */}
      <Card className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-xl font-bold">{name}</h1>
          {receipt.status === 'draft' && <Badge variant="secondary">Borrador</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{fmtLongDate(receipt.purchasedAt)}</p>
        <p className="mt-2 text-3xl font-bold">{fmtEUR(receipt.total, receipt.currency)}</p>
      </Card>

      {/* ── Artículos ── */}
      <section className="space-y-2">
        <h2 className="font-semibold">Artículos ({receipt.lines.length})</h2>
        {receipt.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este ticket no tiene artículos registrados.
          </p>
        ) : (
          <ul className="space-y-1.5 list-none p-0 m-0" aria-label="Artículos del ticket">
            {receipt.lines.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-2 rounded-md bg-card p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {SPEND_CATEGORY_LABELS[l.category]}
                  </p>
                </div>
                <p className="font-medium">{fmtEUR(l.lineTotal, receipt.currency)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button
        variant="outline"
        className="w-full text-destructive"
        onClick={onDelete}
        disabled={isDeleting}
      >
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        {isDeleting ? 'Eliminando…' : 'Borrar ticket'}
      </Button>
    </div>
  );
}
