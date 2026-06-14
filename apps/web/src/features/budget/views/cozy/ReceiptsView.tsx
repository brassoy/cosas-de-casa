/**
 * ReceiptsView — vista presentacional `cozy` (cuaderno manuscrito) de la lista
 * de tickets y entrada principal de la feature budget.
 *
 * Misma funcionalidad y mismo contrato (`ReceiptsViewProps`) que la vista base:
 * lista de tickets, botón de captura (OCR), fase "IA no disponible" con alta
 * manual, errores de captura y editor de borrador a pantalla completa. Solo
 * cambia la estética: cabecera manuscrita Caveat, fichas de papel `ck-card`
 * clavadas con chincheta `ck-pin`, etiquetas `ck-tag`, sellos `ck-stamp` para
 * los borradores y botones pill `ck-btn-*`.
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

/** Paleta de chinchetas (rotación por índice). Tomada del kit estático cozy. */
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'] as const;

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
    <div className="ck space-y-4">
      {/* ── Cabecera manuscrita ── */}
      <header className="text-center relative mb-2">
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">tickets</h1>
        <button
          type="button"
          className="ck-tag absolute right-0 top-1"
          onClick={onGoSpend}
        >
          ver gasto →
        </button>
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
        className="ck-btn ck-btn-red w-full"
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
            + subir ticket
          </>
        )}
      </button>

      {/* ── IA no disponible (503) ── */}
      {capture.phase === 'ai-unavailable' && (
        <div className="ck-card p-4 space-y-2" role="alert">
          <span className="ck-tape" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="ck-stamp">IA OFFLINE</span>
            <p className="ck-marker text-2xl text-error">La IA no está disponible</p>
          </div>
          <p className="text-base">
            Hay que recargar la clave de MiniMax. Mientras tanto, puedes introducir el ticket
            manualmente.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="ck-btn ck-btn-blue !text-base !py-1 !px-3" onClick={onManualEntry}>
              <Plus className="mr-1 inline h-4 w-4" aria-hidden="true" />
              Alta manual
            </button>
            <button type="button" className="ck-btn !text-base !py-1 !px-3" onClick={onCancelCapture}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Error genérico de captura/guardado ── */}
      {captureError && (
        <div className="ck-card p-4" role="alert" style={{ borderColor: 'var(--color-error)' }}>
          <p className="text-base text-error">{captureError}</p>
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
          {receipts.map((r, i) => (
            <ReceiptRow
              key={r.id}
              receipt={r}
              pin={PINS[i % PINS.length]!}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </ScreenState>
    </div>
  );
}

// ── Fila de ticket ─────────────────────────────────────────────────────────────

interface ReceiptRowProps {
  receipt: ReceiptSummaryDto;
  pin: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function ReceiptRow({ receipt: r, pin, onOpen, onDelete }: ReceiptRowProps) {
  const name = r.merchant ?? 'Sin establecimiento';
  return (
    <li>
      <div className="ck-card p-3 flex items-center gap-3">
        <span
          className="ck-pin"
          aria-hidden="true"
          style={{ background: `radial-gradient(circle at 30% 30%, #fff, ${pin})` }}
        />
        <button
          type="button"
          onClick={() => onOpen(r.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Ver ticket ${name}`}
        >
          <span className="text-2xl" aria-hidden="true">🧾</span>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <p className="ck-marker text-xl truncate text-accent">{name}</p>
              {r.status === 'draft' && <span className="ck-tag">borrador</span>}
            </div>
            <p className="text-sm opacity-70">
              {fmtDate(r.purchasedAt)} · {r.lineCount}{' '}
              {r.lineCount === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
        </button>
        <p className="ck-marker text-2xl whitespace-nowrap">{fmtEUR(r.total, r.currency)}</p>
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
