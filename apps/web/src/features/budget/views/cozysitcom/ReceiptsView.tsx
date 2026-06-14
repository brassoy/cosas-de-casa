/**
 * ReceiptsView — vista presentacional `cozysitcom` (sitcom 70s) de la lista de
 * tickets y entrada principal de la feature budget.
 *
 * Misma funcionalidad y mismo contrato (`ReceiptsViewProps`) que la vista base:
 * lista de tickets, botón de captura (OCR), fase "IA no disponible" con alta
 * manual, errores de captura y editor de borrador a pantalla completa. Solo
 * cambia la estética: cabecera de madera, cinta mostaza, marcos `cz-frame`,
 * sellos y botones físicos `cz-btn-*`.
 *
 * Presentacional puro: solo props in / callbacks out. La máquina de estados de
 * captura, la compresión de imagen y el OCR (503 → IA no disponible) viven en el
 * container; aquí solo se pinta cada fase y se emiten callbacks.
 */

import { useRef } from 'react';
import { Camera, Loader2, Plus, Receipt as ReceiptIcon, Trash2 } from 'lucide-react';
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
    <div className="cz space-y-4">
      {/* ── Cabecera tipo cintillo de sitcom ── */}
      <header className="cz-pop">
        <div className="cz-wood inline-block mb-2">
          <p className="cz-serif text-base">Tickets y gasto</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <h1 className="cz-serif text-4xl leading-none">Tickets</h1>
          <button type="button" className="cz-btn-ghost !py-1.5 !px-3 text-xs" onClick={onGoSpend}>
            Ver gasto
          </button>
        </div>
        <div className="cz-stripe mt-3" />
      </header>

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

      <button
        type="button"
        className="cz-btn-denim w-full text-base"
        onClick={() => fileRef.current?.click()}
        disabled={extracting}
        aria-label="Capturar ticket"
      >
        {extracting ? (
          <>
            <Loader2 className="mr-2 inline h-5 w-5 animate-spin" aria-hidden="true" />
            Procesando…
          </>
        ) : (
          <>
            <Camera className="mr-2 inline h-5 w-5" aria-hidden="true" />
            Capturar ticket
          </>
        )}
      </button>

      {/* ── IA no disponible (503) ── */}
      {capture.phase === 'ai-unavailable' && (
        <div className="cz-frame cz-pop space-y-2" role="alert">
          <div className="flex items-center gap-2">
            <span className="cz-stamp">IA OFFLINE</span>
            <p className="cz-serif text-lg">La IA no está disponible</p>
          </div>
          <p className="text-sm opacity-80">
            Hay que recargar la clave de MiniMax. Mientras tanto, puedes introducir el ticket
            manualmente.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="cz-btn-mustard !py-1.5 !px-3 text-xs" onClick={onManualEntry}>
              <Plus className="mr-1 inline h-4 w-4" aria-hidden="true" />
              Alta manual
            </button>
            <button type="button" className="cz-btn-ghost !py-1.5 !px-3 text-xs" onClick={onCancelCapture}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Error genérico de captura/guardado ── */}
      {captureError && (
        <div className="cz-frame cz-pop" role="alert" style={{ borderColor: 'var(--color-error)' }}>
          <p className="text-sm text-error">{captureError}</p>
        </div>
      )}

      {/* ── Lista de tickets ── */}
      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={!receipts.length}
        emptyIcon={<ReceiptIcon className="h-10 w-10" aria-hidden="true" />}
        emptyTitle="Aún no hay tickets registrados."
      >
        <ul className="space-y-3 list-none p-0 m-0" aria-label="Lista de tickets">
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
      <div className="cz-frame flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpen(r.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Ver ticket ${name}`}
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-xl text-text-inverse">
            🧾
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <p className="cz-serif truncate">{name}</p>
              {r.status === 'draft' && <span className="cz-tag">Borrador</span>}
            </div>
            <p className="text-xs opacity-60">
              {fmtDate(r.purchasedAt)} · {r.lineCount}{' '}
              {r.lineCount === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
        </button>
        <p className="cz-serif text-lg whitespace-nowrap">{fmtEUR(r.total, r.currency)}</p>
        <button
          type="button"
          onClick={() => onDelete(r.id)}
          aria-label={`Eliminar ticket ${name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-error hover:bg-surface-sunken"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
