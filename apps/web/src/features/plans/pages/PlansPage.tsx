import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyPlans } from '../hooks/usePlans';
import type { PlanSummaryDto, PlanStatus } from '../contracts';

function statusLabel(status: PlanStatus): string {
  const labels: Record<PlanStatus, string> = {
    proposed: 'Propuesto',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

function statusColor(status: PlanStatus): string {
  const colors: Record<PlanStatus, string> = {
    proposed: 'var(--color-text-muted)',
    confirmed: 'var(--color-accent)',
    cancelled: 'var(--color-error)',
  };
  return colors[status];
}

function PlanCard({ plan, onSelect }: { plan: PlanSummaryDto; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} style={styles.planCard}>
      <div style={styles.planCardBody}>
        <div style={styles.planCardTop}>
          <p style={styles.planTitle}>{plan.title}</p>
          <span
            style={{
              ...styles.planStatus,
              color: statusColor(plan.status),
              borderColor: statusColor(plan.status),
            }}
          >
            {statusLabel(plan.status)}
          </span>
        </div>
        {plan.scheduledAt && (
          <p style={styles.planMeta}>
            📅{' '}
            {new Date(plan.scheduledAt).toLocaleDateString('es-ES', {
              dateStyle: 'medium',
            })}{' '}
            {new Date(plan.scheduledAt).toLocaleTimeString('es-ES', {
              timeStyle: 'short',
            })}
          </p>
        )}
        {plan.placeName && <p style={styles.planMeta}>📍 {plan.placeName}</p>}
        <p style={styles.planMeta}>
          👥 {plan.participantCount} {plan.participantCount === 1 ? 'participante' : 'participantes'}
        </p>
      </div>
    </button>
  );
}

export function PlansPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const { data: plans, isLoading, error } = useFamilyPlans(activeFamily?.id);

  if (!activeFamily) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() =>
            void navigate({ to: '/family/$familyId', params: { familyId: activeFamily.id } })
          }
          style={styles.backBtn}
          aria-label="Volver al inicio"
        >
          ← Inicio
        </button>
        <div style={styles.headerRow}>
          <h2 style={styles.heading}>Planes</h2>
          <button
            type="button"
            onClick={() => void navigate({ to: '/plans/create' })}
            style={styles.btnPrimary}
          >
            Nuevo plan
          </button>
        </div>
      </header>

      {isLoading && <p style={styles.muted}>Cargando planes...</p>}

      {error && (
        <p role="alert" style={styles.error}>
          No se han podido cargar los planes. Inténtalo de nuevo.
        </p>
      )}

      {plans && plans.length === 0 && !isLoading && (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>No hay planes todavía</p>
          <p style={styles.muted}>Crea el primero y compártelo con tus familias amigas.</p>
        </div>
      )}

      {plans && plans.length > 0 && (
        <ul style={styles.planList}>
          {plans.map((p) => (
            <li key={p.id} style={styles.listItem}>
              <PlanCard
                plan={p}
                onSelect={() =>
                  void navigate({ to: '/plans/$planId', params: { planId: p.id } })
                }
              />
            </li>
          ))}
        </ul>
      )}
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
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    padding: 0,
    textAlign: 'left',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  planList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  listItem: {
    display: 'contents',
  },
  planCard: {
    display: 'block',
    width: '100%',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s',
  },
  planCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  planCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-2)',
  },
  planTitle: {
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text)',
  },
  planStatus: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    flexShrink: 0,
  },
  planMeta: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-12)',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
