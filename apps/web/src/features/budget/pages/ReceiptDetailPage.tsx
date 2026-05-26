/**
 * ReceiptDetailPage — detalle y edición de un ticket concreto.
 *
 * Permite editar (PATCH) y eliminar (DELETE) el ticket.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  useReceiptDetail,
  useUpdateReceipt,
  useDeleteReceipt,
} from '../hooks/useBudget';
import { ReceiptDraftEditor } from '../components/ReceiptDraftEditor';
import { SPEND_CATEGORY_LABELS } from '../contracts';
import type { CreateReceiptInput } from '../contracts';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatAmount(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { familyId, receiptId } = useParams({ strict: false }) as {
    familyId: string;
    receiptId: string;
  };

  const { data: receipt, isLoading, error } = useReceiptDetail(receiptId);
  const updateMutation = useUpdateReceipt(receiptId, familyId);
  const deleteMutation = useDeleteReceipt(receiptId, familyId);

  const [isEditing, setIsEditing] = useState(false);

  function handleDelete() {
    if (!confirm('¿Eliminar este ticket?')) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () =>
        void navigate({
          to: '/family/$familyId/budget',
          params: { familyId },
        }),
    });
  }

  function handleSave(input: CreateReceiptInput) {
    updateMutation.mutate(input, {
      onSuccess: () => setIsEditing(false),
    });
  }

  if (isLoading) {
    return <p style={styles.muted}>Cargando ticket…</p>;
  }

  if (error || !receipt) {
    return (
      <p role="alert" style={styles.errorBanner}>
        No se ha podido cargar el ticket.
      </p>
    );
  }

  if (isEditing) {
    return (
      <ReceiptDraftEditor
        draft={{
          merchant: receipt.merchant,
          purchasedAt: receipt.purchasedAt,
          total: receipt.total,
          currency: receipt.currency,
          lines: receipt.lines,
        }}
        isSaving={updateMutation.isPending}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/family/$familyId/budget',
              params: { familyId },
            })
          }
          style={styles.backBtn}
          aria-label="Volver a la lista de tickets"
        >
          ‹ Volver
        </button>
        <div style={styles.headerActions}>
          <button type="button" onClick={() => setIsEditing(true)} style={styles.btnSecondary}>
            Editar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={styles.btnDanger}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </header>

      <div style={styles.summary}>
        <h2 style={styles.merchant}>{receipt.merchant ?? 'Sin establecimiento'}</h2>
        <p style={styles.date}>{formatDate(receipt.purchasedAt)}</p>
        <p style={styles.total}>{formatAmount(receipt.total, receipt.currency)}</p>
        {receipt.status === 'draft' && (
          <span style={styles.draftBadge}>Borrador</span>
        )}
      </div>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Artículos ({receipt.lines.length})</h3>
        {receipt.lines.length === 0 && (
          <p style={styles.muted}>Este ticket no tiene artículos registrados.</p>
        )}
        <ul style={styles.lineList} aria-label="Artículos del ticket">
          {receipt.lines.map((line) => (
            <li key={line.id} style={styles.lineItem}>
              <div style={styles.lineLeft}>
                <p style={styles.lineDesc}>{line.description}</p>
                <span style={styles.lineCat}>
                  {SPEND_CATEGORY_LABELS[line.category]}
                </span>
              </div>
              <span style={styles.lineAmount}>
                {formatAmount(line.lineTotal, receipt.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

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
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-2)',
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
  btnDanger: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-error)',
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    padding: 'var(--space-5)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-border)',
  },
  merchant: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  date: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  total: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-accent)',
    marginTop: 'var(--space-2)',
  },
  draftBadge: {
    alignSelf: 'flex-start',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '1px var(--space-2)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  lineList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  lineItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    gap: 'var(--space-3)',
  },
  lineLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  lineDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
  },
  lineCat: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  lineAmount: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    flexShrink: 0,
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    maxWidth: '640px',
    margin: '0 auto',
  },
};
