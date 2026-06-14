/**
 * ReceiptsView — vista presentacional `base` (shadcn) de la lista de tickets y
 * entrada principal de la feature budget.
 *
 * Porta el JSX del componente base del kit (Lovable `ReceiptsPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con
 * `ReceiptSummaryDto` real y AMPLIANDO el contrato de captura: además de las 3
 * fases del kit (`idle | extracting | ai-unavailable`), modela el editor de
 * borrador a pantalla completa (`draft | manual`) como sub-flujo props-driven.
 *
 * Presentacional puro: solo props in / callbacks out. La máquina de estados de
 * captura, la compresión de imagen y el OCR (503 → IA no disponible) viven en el
 * container; aquí solo se pinta cada fase y se emiten callbacks.
 */

import { useRef } from 'react';
import { Camera, Loader2, Plus, Receipt as ReceiptIcon, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { ScreenState } from '@/shared/components/ScreenState';
import type { ReceiptSummaryDto } from '../../contracts';
import type { ReceiptsViewProps } from '../types';
import ReceiptDraftEditor from './ReceiptDraftEditor';

const fmtEUR = (n: number, currency = 'EUR') => {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function ReceiptsView(props: ReceiptsViewProps) {
  const {
    receipts,
    isLoading,
    error,
    capture,
    captureError,
    isSavingDraft,
    onCapture,
    onManualEntry,
    onCancelCapture,
    onSaveDraft,
    onOpen,
    onDelete,
    onGoSpend,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Editor de borrador a pantalla completa (OCR o alta manual) ──────────────
  if (capture.phase === 'draft' || capture.phase === 'manual') {
    const draft = capture.draft ?? { lines: [], currency: 'EUR' };
    // `key` por fase: arranca el editor limpio al cambiar entre OCR y manual.
    return (
      <ReceiptDraftEditor
        key={capture.phase}
        draft={draft}
        isSaving={isSavingDraft}
        onSave={onSaveDraft}
        onCancel={onCancelCapture}
      />
    );
  }

  const extracting = capture.phase === 'extracting';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tickets y gasto</h1>
        <Button variant="outline" size="sm" onClick={onGoSpend}>
          Ver gasto
        </Button>
      </div>

      {/* Input de fichero oculto (cámara/galería). */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Seleccionar imagen del ticket"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Limpiar para poder repetir el mismo archivo.
          e.target.value = '';
          if (f) onCapture(f);
        }}
      />

      <Button
        className="h-12 w-full"
        onClick={() => fileRef.current?.click()}
        disabled={extracting}
        aria-label="Capturar ticket"
      >
        {extracting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
            Procesando…
          </>
        ) : (
          <>
            <Camera className="mr-2 h-5 w-5" aria-hidden="true" />
            Capturar ticket
          </>
        )}
      </Button>

      {/* ── IA no disponible (503) ── */}
      {capture.phase === 'ai-unavailable' && (
        <Alert variant="destructive" className="space-y-2">
          <AlertTitle>La IA no está disponible</AlertTitle>
          <AlertDescription>
            Hay que recargar la clave de MiniMax. Mientras tanto, puedes introducir el ticket
            manualmente.
          </AlertDescription>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={onManualEntry}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Alta manual
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelCapture}>
              Cancelar
            </Button>
          </div>
        </Alert>
      )}

      {/* ── Error genérico de captura/guardado ── */}
      {captureError && (
        <Alert variant="destructive">
          <AlertDescription>{captureError}</AlertDescription>
        </Alert>
      )}

      {/* ── Lista de tickets ── */}
      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={!receipts.length}
        emptyIcon={<ReceiptIcon className="h-10 w-10" aria-hidden="true" />}
        emptyTitle="Aún no hay tickets registrados."
      >
        <ul className="space-y-2 list-none p-0 m-0" aria-label="Lista de tickets">
          {receipts.map((r) => (
            <ReceiptRow key={r.id} receipt={r} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </ul>
      </ScreenState>
    </div>
  );
}

// ── Fila de ticket ─────────────────────────────────────────────────────────────

interface ReceiptRowProps {
  receipt: ReceiptSummaryDto;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function ReceiptRow({ receipt: r, onOpen, onDelete }: ReceiptRowProps) {
  const name = r.merchant ?? 'Sin establecimiento';
  return (
    <li>
      <Card className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => onOpen(r.id)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Ver ticket ${name}`}
        >
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate font-medium">{name}</p>
            {r.status === 'draft' && <Badge variant="secondary">Borrador</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtDate(r.purchasedAt)} · {r.lineCount}{' '}
            {r.lineCount === 1 ? 'artículo' : 'artículos'}
          </p>
        </button>
        <div className="text-right">
          <p className="font-semibold">{fmtEUR(r.total, r.currency)}</p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(r.id)}
          aria-label={`Eliminar ticket ${name}`}
          className="grid h-9 w-9 place-items-center rounded-md text-destructive hover:bg-muted"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </Card>
    </li>
  );
}
