/**
 * SpendPage — resumen de gastos familiares.
 *
 * Muestra:
 *  - Total del período.
 *  - Barras por categoría (CSS puro, sin librerías).
 *  - Barras por mes.
 *
 * Usa Intl.NumberFormat('es-ES', { style: 'currency' }).
 */

import { useNavigate, useParams } from '@tanstack/react-router';
import { useSpendSummary } from '../hooks/useBudget';
import { SPEND_CATEGORY_LABELS } from '../contracts';
import type { SpendCategory } from '../contracts';

function formatAmount(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatMonth(ym: string): string {
  // ym = "2026-05"
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// ── Componente de barra ───────────────────────────────────────────────────────

interface BarProps {
  label: string;
  amount: number;
  currency: string;
  pct: number; // 0–100
  color?: string;
}

function Bar({ label, amount, currency, pct, color = 'var(--color-accent)' }: BarProps) {
  return (
    <div style={barStyles.row}>
      <div style={barStyles.labelRow}>
        <span style={barStyles.label}>{label}</span>
        <span style={barStyles.amount}>{formatAmount(amount, currency)}</span>
      </div>
      <div style={barStyles.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          style={{
            ...barStyles.fill,
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

const barStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
  },
  amount: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  track: {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
};

// ── Colores por categoría ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<SpendCategory, string> = {
  groceries: '#16a34a',
  household: '#2563eb',
  dining_out: '#ea580c',
  leisure: '#9333ea',
  other: '#6b7280',
};

// ── Página principal ──────────────────────────────────────────────────────────

export function SpendPage() {
  const navigate = useNavigate();
  const { familyId } = useParams({ strict: false }) as { familyId: string };

  const { data: summary, isLoading, error } = useSpendSummary(familyId);

  if (isLoading) {
    return <p style={styles.muted}>Cargando resumen de gasto…</p>;
  }

  if (error) {
    return (
      <p role="alert" style={styles.errorBanner}>
        No se ha podido cargar el resumen de gasto.
      </p>
    );
  }

  const maxCategory = summary ? Math.max(...summary.byCategory.map((c) => c.total), 1) : 1;
  const maxMonth = summary ? Math.max(...summary.byMonth.map((m) => m.total), 1) : 1;

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
          aria-label="Volver a tickets"
        >
          ‹ Tickets
        </button>
        <h2 style={styles.pageTitle}>Resumen de gasto</h2>
      </header>

      {summary && (
        <>
          {/* ── Total ────────────────────────────────────────────────── */}
          <div style={styles.totalCard}>
            <p style={styles.totalLabel}>Total registrado</p>
            <p style={styles.totalAmount}>
              {formatAmount(summary.total, summary.currency)}
            </p>
          </div>

          {/* ── Por categoría ─────────────────────────────────────────── */}
          {summary.byCategory.length > 0 && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Por categoría</h3>
              <div style={styles.bars}>
                {summary.byCategory.map((item) => (
                  <Bar
                    key={item.category}
                    label={SPEND_CATEGORY_LABELS[item.category]}
                    amount={item.total}
                    currency={summary.currency}
                    pct={Math.round((item.total / maxCategory) * 100)}
                    color={CATEGORY_COLORS[item.category]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Por mes ───────────────────────────────────────────────── */}
          {summary.byMonth.length > 0 && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Por mes</h3>
              <div style={styles.bars}>
                {summary.byMonth.map((item) => (
                  <Bar
                    key={item.month}
                    label={formatMonth(item.month)}
                    amount={item.total}
                    currency={summary.currency}
                    pct={Math.round((item.total / maxMonth) * 100)}
                  />
                ))}
              </div>
            </section>
          )}

          {summary.byCategory.length === 0 && summary.byMonth.length === 0 && (
            <p style={styles.muted}>
              Aún no hay datos de gasto. Añade tickets para ver el resumen.
            </p>
          )}
        </>
      )}
    </div>
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
    gap: 'var(--space-4)',
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
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  totalCard: {
    padding: 'var(--space-5)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  totalLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  totalAmount: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  bars: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
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
