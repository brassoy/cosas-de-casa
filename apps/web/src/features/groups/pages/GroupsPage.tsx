import { useNavigate } from '@tanstack/react-router';
import { useMyGroups } from '../hooks/useGroups';
import { useGroupsStore } from '../store/groups.store';
import type { GroupSummaryDto } from '../contracts';

function GroupCard({ group, onSelect }: { group: GroupSummaryDto; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} style={styles.groupCard}>
      <div style={styles.groupCardLeft}>
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={group.name} style={styles.groupAvatar} />
        ) : (
          <div style={styles.groupAvatarFallback}>
            <span style={styles.groupAvatarLetter}>{group.name[0]?.toUpperCase()}</span>
          </div>
        )}
      </div>
      <div style={styles.groupCardBody}>
        <p style={styles.groupName}>{group.name}</p>
        {group.description && <p style={styles.groupDesc}>{group.description}</p>}
        <p style={styles.groupRole}>
          {group.role === 'OWNER' ? 'Propietario' : 'Miembro'}
        </p>
      </div>
    </button>
  );
}

export function GroupsPage() {
  const navigate = useNavigate();
  const setActiveGroup = useGroupsStore((s) => s.setActiveGroup);
  const { data: groups, isLoading, error } = useMyGroups();

  async function handleSelectGroup(group: GroupSummaryDto) {
    setActiveGroup({ id: group.id, name: group.name });
    await navigate({ to: '/groups/$groupId', params: { groupId: group.id } });
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h2 style={styles.heading}>Mis peñas</h2>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => void navigate({ to: '/groups/join' })}
            style={styles.btnSecondary}
          >
            Unirse con PIN
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/groups/create' })}
            style={styles.btnPrimary}
          >
            Nueva peña
          </button>
        </div>
      </header>

      {isLoading && <p style={styles.muted}>Cargando peñas...</p>}

      {error && (
        <p role="alert" style={styles.error}>
          No se han podido cargar las peñas. Inténtalo de nuevo.
        </p>
      )}

      {groups && groups.length === 0 && !isLoading && (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>Aún no perteneces a ninguna peña</p>
          <p style={styles.muted}>Crea una nueva o únete a una con un PIN de invitación.</p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <ul style={styles.groupList}>
          {groups.map((g) => (
            <li key={g.id} style={styles.listItem}>
              <GroupCard group={g} onSelect={() => void handleSelectGroup(g)} />
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  heading: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-2)',
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
  btnSecondary: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
  },
  groupList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  listItem: {
    display: 'contents',
  },
  groupCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'border-color 0.15s',
  },
  groupCardLeft: {
    flexShrink: 0,
  },
  groupAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
  },
  groupAvatarFallback: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-accent-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarLetter: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-accent)',
  },
  groupCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    minWidth: 0,
  },
  groupName: {
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupRole: {
    fontSize: 'var(--font-size-xs)',
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
