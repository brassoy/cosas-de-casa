/**
 * ReceiptsPage — lista de tickets y entrada principal de la feature budget.
 *
 * Flujo:
 *  1. Lista de tickets de la familia.
 *  2. Botón "Capturar ticket" → input de cámara/archivo.
 *  3. Comprime la imagen → llama a /receipts/extract.
 *     - 503 → aviso IA no disponible + botón "Alta manual".
 *     - OK  → muestra borrador editable → guardar.
 *  4. Botón "Ver gasto" → navega a SpendPage.
 */

import { useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  useFamilyReceipts,
  useExtractReceipt,
  useCreateReceipt,
  useDeleteReceipt,
  compressImageToBase64,
  type ApiRequestError,
} from '../hooks/useBudget';
import { ReceiptDraftEditor } from '../components/ReceiptDraftEditor';
import type { ExtractReceiptResponse, CreateReceiptInput } from '../contracts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function formatAmount(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
  } catch {
    return fmt.format(amount);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isAiUnavailable(error: ApiRequestError | null): boolean {
  return error?.status === 503;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ReceiptsPage() {
  const navigate = useNavigate();
  const { familyId } = useParams({ strict: false }) as { familyId: string };

  const { data: receipts = [], isLoading, error: listError } = useFamilyReceipts(familyId);
  const extractMutation = useExtractReceipt(familyId);
  const createMutation = useCreateReceipt(familyId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado del flujo de captura
  const [captureState, setCaptureState] = useState<
    | { phase: 'idle' }
    | { phase: 'extracting' }
    | { phase: 'ai-unavailable' }
    | { phase: 'draft'; draft: ExtractReceiptResponse }
    | { phase: 'manual' }
  >({ phase: 'idle' });

  const [captureError, setCaptureError] = useState<string | null>(null);

  // ── Manejadores ──────────────────────────────────────────────────────────────

  function handleCaptureClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limpiar el input para poder repetir el mismo archivo
    e.target.value = '';

    setCaptureError(null);
    setCaptureState({ phase: 'extracting' });

    try {
      const base64 = await compressImageToBase64(file);
      const draft = await extractMutation.mutateAsync(base64);
      setCaptureState({ phase: 'draft', draft });
    } catch (err) {
      const apiErr = err as ApiRequestError;
      if (isAiUnavailable(apiErr)) {
        setCaptureState({ phase: 'ai-unavailable' });
      } else {
        setCaptureState({ phase: 'idle' });
        setCaptureError('No se ha podido procesar la imagen. Inténtalo de nuevo.');
      }
    }
  }

  async function handleSaveDraft(input: CreateReceiptInput) {
    try {
      await createMutation.mutateAsync(input);
      setCaptureState({ phase: 'idle' });
    } catch {
      setCaptureError('No se ha podido guardar el ticket. Inténtalo de nuevo.');
    }
  }

  function handleManualEntry() {
    setCaptureState({
      phase: 'draft',
      draft: {
        lines: [],
        currency: 'EUR',
      },
    });
  }

  function handleCancelCapture() {
    setCaptureState({ phase: 'idle' });
    setCaptureError(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Si hay un borrador abierto, mostramos el editor a pantalla completa
  if (captureState.phase === 'draft' || captureState.phase === 'manual') {
    const draft = captureState.phase === 'draft' ? captureState.draft : { lines: [], currency: 'EUR' };
    return (
      <ReceiptDraftEditor
        draft={draft}
        isSaving={createMutation.isPending}
        onSave={handleSaveDraft}
        onCancel={handleCancelCapture}
      />
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <header style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Tickets y gasto</h2>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/budget/spend',
                params: { familyId },
              })
            }
            style={styles.btnSecondary}
          >
            Ver gasto
          </button>
          <button
            type="button"
            onClick={handleCaptureClick}
            style={styles.btnPrimary}
            disabled={captureState.phase === 'extracting'}
            aria-label="Capturar ticket"
          >
            {captureState.phase === 'extracting' ? 'Procesando...' : '+ Capturar ticket'}
          </button>
        </div>
      </header>

      {/* Input de fichero oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Seleccionar imagen del ticket"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
      />

      {/* ── Aviso IA no disponible ────────────────────────────────────────── */}
      {captureState.phase === 'ai-unavailable' && (
        <div role="alert" style={styles.aiUnavailable}>
          <p style={styles.aiUnavailableTitle}>La IA no está disponible</p>
          <p style={styles.aiUnavailableDesc}>
            Hay que recargar la clave de MiniMax. Mientras tanto, puedes introducir el ticket
            manualmente.
          </p>
          <div style={styles.aiUnavailableActions}>
            <button type="button" onClick={handleManualEntry} style={styles.btnPrimary}>
              Alta manual
            </button>
            <button type="button" onClick={handleCancelCapture} style={styles.btnGhost}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Error genérico ────────────────────────────────────────────────── */}
      {captureError && (
        <p role="alert" style={styles.errorBanner}>
          {captureError}
        </p>
      )}

      {/* ── Lista de tickets ──────────────────────────────────────────────── */}
      {isLoading && <p style={styles.muted}>Cargando tickets…</p>}

      {listError && (
        <p role="alert" style={styles.errorBanner}>
          No se han podido cargar los tickets.
        </p>
      )}

      {!isLoading && !listError && receipts.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>Aún no hay tickets registrados.</p>
          <button type="button" onClick={handleCaptureClick} style={styles.btnPrimary}>
            Captura tu primer ticket
          </button>
        </div>
      )}

      {receipts.length > 0 && (
        <ul style={styles.list} aria-label="Lista de tickets">
          {receipts.map((r) => (
            <ReceiptRow
              key={r.id}
              receipt={r}
              familyId={familyId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── ReceiptRow ────────────────────────────────────────────────────────────────

interface ReceiptRowProps {
  receipt: {
    id: string;
    merchant?: string;
    purchasedAt: string;
    total: number;
    currency: string;
    status: 'draft' | 'confirmed';
    lineCount: number;
  };
  familyId: string;
}

function ReceiptRow({ receipt, familyId }: ReceiptRowProps) {
  const navigate = useNavigate();
  const deleteMutation = useDeleteReceipt(receipt.id, familyId);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el ticket de ${receipt.merchant ?? formatDate(receipt.purchasedAt)}?`)) {
      return;
    }
    deleteMutation.mutate();
  }

  return (
    <li style={styles.card}>
      <button
        type="button"
        style={styles.cardBtn}
        onClick={() =>
          void navigate({
            to: '/family/$familyId/budget/receipts/$receiptId',
            params: { familyId, receiptId: receipt.id },
          })
        }
        aria-label={`Ver ticket ${receipt.merchant ?? formatDate(receipt.purchasedAt)}`}
      >
        <div style={styles.cardContent}>
          <div style={styles.cardMain}>
            <p style={styles.cardTitle}>
              {receipt.merchant ?? 'Sin establecimiento'}
            </p>
            <p style={styles.cardMeta}>
              {formatDate(receipt.purchasedAt)} · {receipt.lineCount}{' '}
              {receipt.lineCount === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
          <div style={styles.cardRight}>
            <span style={styles.cardAmount}>
              {formatAmount(receipt.total, receipt.currency)}
            </span>
            {receipt.status === 'draft' && (
              <span style={styles.draftBadge}>Borrador</span>
            )}
          </div>
        </div>
        <span style={styles.chevron}>›</span>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        style={styles.deleteBtn}
        disabled={deleteMutation.isPending}
        aria-label={`Eliminar ticket ${receipt.merchant ?? formatDate(receipt.purchasedAt)}`}
      >
        {deleteMutation.isPending ? '…' : '×'}
      </button>
    </li>
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
    alignItems: 'center',
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
  aiUnavailable: {
    backgroundColor: 'rgba(234,179,8,0.1)',
    border: '1px solid rgba(234,179,8,0.4)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  aiUnavailableTitle: {
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  aiUnavailableDesc: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  aiUnavailableActions: {
    display: 'flex',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-2)',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-12) 0',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  card: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    backgroundColor: 'var(--color-surface-raised)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'stretch',
  },
  cardBtn: {
    flex: 1,
    padding: 'var(--space-4)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left',
    gap: 'var(--space-3)',
  },
  cardContent: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  cardTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  cardMeta: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  cardRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 'var(--space-1)',
    flexShrink: 0,
  },
  cardAmount: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  draftBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '1px var(--space-2)',
  },
  chevron: {
    fontSize: 'var(--font-size-xl)',
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  },
  deleteBtn: {
    padding: '0 var(--space-3)',
    background: 'none',
    border: 'none',
    borderLeft: '1px solid var(--color-border)',
    cursor: 'pointer',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-lg)',
    lineHeight: 1,
    flexShrink: 0,
  },
};
