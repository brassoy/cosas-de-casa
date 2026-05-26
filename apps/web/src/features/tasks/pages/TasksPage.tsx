import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyTasks } from '../hooks/useTasks';
import { useTasksStore } from '../store/tasks.store';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TASK_STATUS_LABELS } from '../types';
import type { TaskDto } from '../types';
import type { TaskStatus } from '@cosasdecasa/contracts';

// ── Presentational: tarjeta de tarea ─────────────────────────────────────────

interface TaskCardProps {
  task: TaskDto;
  onNavigate: () => void;
}

function TaskCard({ task, onNavigate }: TaskCardProps) {
  const statusColors: Record<TaskStatus, string> = {
    OPEN: 'var(--color-text-muted)',
    IN_PROGRESS: 'var(--color-accent)',
    DONE: 'var(--color-success, #16a34a)',
  };

  return (
    <li style={styles.card}>
      <button type="button" onClick={onNavigate} style={styles.cardBtn}>
        <div style={styles.cardContent}>
          <div style={styles.cardMain}>
            <p style={styles.cardTitle}>{task.title}</p>
            {task.description && (
              <p style={styles.cardDesc}>{task.description}</p>
            )}
            <div style={styles.cardMeta}>
              {task.deadlineDate && (
                <span style={styles.metaChip}>
                  Fecha límite: {new Date(task.deadlineDate).toLocaleDateString('es-ES')}
                </span>
              )}
              {task.assignees.length > 0 && (
                <span style={styles.metaChip}>
                  {task.assignees.map((a) => a.displayName).join(', ')}
                </span>
              )}
              {task.photos.length > 0 && (
                <span style={styles.metaChip}>
                  {task.photos.length} foto{task.photos.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <span
            style={{
              ...styles.statusBadge,
              color: statusColors[task.status],
              borderColor: statusColors[task.status],
            }}
          >
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </div>
        <span style={styles.chevron}>›</span>
      </button>
    </li>
  );
}

// ── Presentational: filtros ───────────────────────────────────────────────────

interface FiltersBarProps {
  statusFilter: TaskStatus | 'ALL';
  assigneeFilter: string | 'ALL';
  members: { userId: string; displayName: string }[];
  onStatusChange: (v: TaskStatus | 'ALL') => void;
  onAssigneeChange: (v: string | 'ALL') => void;
}

function FiltersBar({
  statusFilter,
  assigneeFilter,
  members,
  onStatusChange,
  onAssigneeChange,
}: FiltersBarProps) {
  return (
    <div style={styles.filtersBar}>
      <div style={styles.filterGroup}>
        <label style={styles.filterLabel} htmlFor="filter-status">
          Estado
        </label>
        <select
          id="filter-status"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus | 'ALL')}
          style={styles.select}
          aria-label="Filtrar por estado"
        >
          <option value="ALL">Todos</option>
          <option value="OPEN">{TASK_STATUS_LABELS.OPEN}</option>
          <option value="IN_PROGRESS">{TASK_STATUS_LABELS.IN_PROGRESS}</option>
          <option value="DONE">{TASK_STATUS_LABELS.DONE}</option>
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.filterLabel} htmlFor="filter-assignee">
          Asignado a
        </label>
        <select
          id="filter-assignee"
          value={assigneeFilter}
          onChange={(e) => onAssigneeChange(e.target.value)}
          style={styles.select}
          aria-label="Filtrar por asignado"
        >
          <option value="ALL">Todos</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function TasksPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const { data: tasks = [], isLoading, error } = useFamilyTasks(activeFamily?.id);
  const { data: members = [] } = useFamilyMembers(activeFamily?.id);

  const filters = useTasksStore((s) => s.filters);
  const setStatusFilter = useTasksStore((s) => s.setStatusFilter);
  const setAssigneeFilter = useTasksStore((s) => s.setAssigneeFilter);

  const [showCreate, setShowCreate] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filters.status !== 'ALL' && t.status !== filters.status) return false;
    if (
      filters.assigneeId !== 'ALL' &&
      !t.assignees.some((a) => a.userId === filters.assigneeId)
    )
      return false;
    return true;
  });

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
        <h2 style={styles.pageTitle}>Tareas</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={styles.btnPrimary}
          aria-label="Crear tarea"
        >
          + Crear tarea
        </button>
      </header>

      <FiltersBar
        statusFilter={filters.status}
        assigneeFilter={filters.assigneeId}
        members={members}
        onStatusChange={setStatusFilter}
        onAssigneeChange={setAssigneeFilter}
      />

      {isLoading && <p style={styles.muted}>Cargando tareas…</p>}

      {error && (
        <p role="alert" style={styles.error}>
          No se han podido cargar las tareas.
        </p>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            {tasks.length === 0
              ? 'Aún no hay ninguna tarea.'
              : 'Ninguna tarea coincide con los filtros.'}
          </p>
          {tasks.length === 0 && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              style={styles.btnPrimary}
            >
              Crear mi primera tarea
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <ul style={styles.list}>
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onNavigate={() =>
                void navigate({ to: '/tasks/$taskId', params: { taskId: t.id } })
              }
            />
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateTaskModal
          familyId={activeFamily.id}
          currentUserId={user?.id ?? ''}
          members={members}
          onClose={() => setShowCreate(false)}
        />
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
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
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
  filtersBar: {
    display: 'flex',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
    minWidth: '140px',
  },
  filterLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
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
  },
  cardBtn: {
    width: '100%',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
  },
  cardTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  cardDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-1)',
    marginTop: 'var(--space-1)',
  },
  metaChip: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px var(--space-2)',
  },
  statusBadge: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '2px var(--space-2)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chevron: {
    fontSize: 'var(--font-size-xl)',
    color: 'var(--color-text-muted)',
    flexShrink: 0,
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
    fontSize: 'var(--font-size-base)',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
