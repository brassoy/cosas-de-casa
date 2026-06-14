/**
 * ReceiptDraftEditor — editor presentacional `base` (shadcn) del borrador de un
 * ticket (extraído por OCR, alta manual o edición de uno existente).
 *
 * Sub-componente presentacional PURO y props-driven: edita merchant + fecha +
 * divisa + líneas (descripción, importe, categoría) y emite un
 * `CreateReceiptInput` completo al guardar. Sin fetch, sin hooks de datos.
 *
 * Es compartido por `ReceiptsView` (captura/alta manual) y `ReceiptDetailView`
 * (edición). El estado del formulario es estado de UI local (se siembra con
 * `key` desde el padre al abrir, por eso no usa efectos de sincronización).
 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
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
    <div className="space-y-6" role="main" aria-label="Editor de ticket">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? 'Guardando…' : saveLabel}
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        {/* ── Datos generales ── */}
        <section className="space-y-3">
          <h2 className="font-semibold">Datos generales</h2>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-merchant">Establecimiento</Label>
            <Input
              id="receipt-merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Nombre del comercio"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="receipt-date">Fecha de compra</Label>
              <Input
                id="receipt-date"
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receipt-currency">Divisa</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="receipt-currency" aria-label="Divisa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR €</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="GBP">GBP £</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ── Líneas ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Artículos ({lines.length})</h2>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Añadir artículo
            </Button>
          </div>

          {lines.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay artículos. Añade uno manualmente.</p>
          )}

          <ul className="space-y-2 list-none p-0 m-0" aria-label="Artículos del ticket">
            {lines.map((line, idx) => (
              <li
                key={idx}
                className="rounded-md border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    placeholder="Descripción"
                    className="flex-[2] min-w-[140px]"
                    aria-label={`Descripción del artículo ${idx + 1}`}
                  />
                  <Input
                    type="number"
                    value={line.lineTotal}
                    onChange={(e) => updateLine(idx, { lineTotal: e.target.value })}
                    placeholder="Importe"
                    min={0}
                    step={0.01}
                    className="flex-1 min-w-[80px]"
                    aria-label={`Importe del artículo ${idx + 1}`}
                  />
                  <Select
                    value={line.category}
                    onValueChange={(v) => updateLine(idx, { category: v as SpendCategory })}
                  >
                    <SelectTrigger
                      className="flex-1 min-w-[120px]"
                      aria-label={`Categoría del artículo ${idx + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SPEND_CATEGORY_LABELS) as SpendCategory[]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {SPEND_CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    aria-label={`Eliminar artículo ${idx + 1}`}
                    className="shrink-0 grid h-9 w-9 place-items-center rounded-md text-destructive hover:bg-muted"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Total calculado ── */}
        <div className="flex items-center justify-between border-t-2 border-border pt-4">
          <span className="font-semibold">Total calculado</span>
          <span className="text-xl font-bold">{fmtEUR(computedTotal, currency)}</span>
        </div>
      </div>
    </div>
  );
}
