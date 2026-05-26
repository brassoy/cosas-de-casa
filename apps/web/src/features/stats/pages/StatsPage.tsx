import { useParams } from '@tanstack/react-router';
import { useFamilyLeaderboard, useFamilyStats } from '../hooks/useStats';
import type { LeaderboardEntryDto, MemberStatsDto } from '../types';

// ── Medallas ──────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function getMedal(rank: number): string {
  return RANK_MEDALS[rank - 1] ?? `#${rank}`;
}

function getDisplayName(name: string | null, email: string): string {
  return name ?? email;
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function AvatarCircle({
  displayName,
  size = 44,
}: {
  displayName: string;
  size?: number;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-accent-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: `${Math.round(size * 0.4)}px`,
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-accent)',
  };

  return (
    <div style={style}>
      <span>{displayName[0]?.toUpperCase()}</span>
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color = 'var(--color-accent)',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={styles.barWrapper}>
      <div style={styles.barHeader}>
        <span style={styles.barLabel}>{label}</span>
        <span style={styles.barValue}>{value}</span>
      </div>
      <div style={styles.barTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ ...styles.barFill, width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function LeaderboardCard({ entry, isFirst }: { entry: LeaderboardEntryDto; isFirst: boolean }) {
  const name = getDisplayName(entry.displayName, entry.email);
  const earnedBadges = entry.badges.filter((b) => b.earnedAt !== null).length;

  return (
    <li
      style={{
        ...styles.rankCard,
        ...(isFirst ? styles.rankCardFirst : {}),
      }}
      aria-label={`${getMedal(entry.rank)} ${name}, ${entry.points} puntos`}
    >
      <span style={styles.medal} aria-hidden="true">
        {getMedal(entry.rank)}
      </span>
      <AvatarCircle displayName={name} size={44} />
      <div style={styles.rankInfo}>
        <p style={styles.rankName}>{name}</p>
        {earnedBadges > 0 && (
          <div style={styles.rankMeta}>
            <span style={styles.achievementBadge} title="Logros desbloqueados">
              ⭐ {earnedBadges}
            </span>
          </div>
        )}
      </div>
      <div style={styles.pointsBlock}>
        <span style={styles.pointsNumber}>{entry.points}</span>
        <span style={styles.pointsLabel}>pts</span>
      </div>
    </li>
  );
}

function MemberContributionRow({
  member,
  maxItems,
  maxTasks,
}: {
  member: MemberStatsDto;
  maxItems: number;
  maxTasks: number;
}) {
  const name = getDisplayName(member.displayName, member.email);
  const earnedBadges = member.badges.filter((b) => b.earnedAt !== null).length;

  return (
    <li style={styles.contribRow}>
      <div style={styles.contribHeader}>
        <AvatarCircle displayName={name} size={36} />
        <span style={styles.contribName}>{name}</span>
        {member.currentStreak > 0 && (
          <span style={styles.streakBadge} title="Racha activa">
            🔥 {member.currentStreak}d
          </span>
        )}
        {earnedBadges > 0 && (
          <span style={styles.achievementBadge} title="Logros desbloqueados">
            ⭐ {earnedBadges}
          </span>
        )}
      </div>
      <div style={styles.contribBars}>
        <StatBar
          label="Ítems añadidos"
          value={member.shoppingItemsAdded}
          max={maxItems}
          color="var(--color-info)"
        />
        <StatBar
          label="Tareas completadas"
          value={member.tasksCompleted}
          max={maxTasks}
          color="var(--color-success)"
        />
      </div>
    </li>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function StatsPage() {
  const { familyId } = useParams({ from: '/family/$familyId/stats' });

  const leaderboard = useFamilyLeaderboard(familyId);
  const stats = useFamilyStats(familyId);

  const maxItems = stats.data
    ? Math.max(...stats.data.members.map((m) => m.shoppingItemsAdded), 1)
    : 1;
  const maxTasks = stats.data
    ? Math.max(...stats.data.members.map((m) => m.tasksCompleted), 1)
    : 1;

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>
          <span aria-hidden="true">📊 </span>Estadísticas del hogar
        </h2>
        <p style={styles.pageSubtitle}>Rendimiento y logros de la familia</p>
      </header>

      {/* ── Ranking ── */}
      <section style={styles.section} aria-labelledby="ranking-heading">
        <h3 id="ranking-heading" style={styles.sectionTitle}>
          🏆 Ranking familiar
        </h3>

        {leaderboard.isLoading && (
          <p style={styles.muted} aria-busy="true">
            Cargando ranking...
          </p>
        )}

        {leaderboard.error && (
          <p role="alert" style={styles.error}>
            No se ha podido cargar el ranking. Inténtalo de nuevo.
          </p>
        )}

        {leaderboard.data && leaderboard.data.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon} aria-hidden="true">🏅</span>
            <p style={styles.emptyText}>Todavía no hay actividad registrada.</p>
            <p style={styles.emptySubtext}>
              Completa tareas y añade ítems para aparecer en el ranking.
            </p>
          </div>
        )}

        {leaderboard.data && leaderboard.data.length > 0 && (
          <ol style={styles.rankList} aria-label="Ranking familiar">
            {leaderboard.data.map((entry) => (
              <LeaderboardCard key={entry.userId} entry={entry} isFirst={entry.rank === 1} />
            ))}
          </ol>
        )}
      </section>

      {/* ── Resumen global ── */}
      {stats.data && (
        <section style={styles.section} aria-labelledby="summary-heading">
          <h3 id="summary-heading" style={styles.sectionTitle}>
            📈 Resumen del hogar
          </h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <span style={styles.summaryNumber}>{stats.data.totalTasksCompleted}</span>
              <span style={styles.summaryLabel}>Tareas completadas</span>
            </div>
            <div style={styles.summaryCard}>
              <span style={styles.summaryNumber}>{stats.data.totalShoppingItemsAdded}</span>
              <span style={styles.summaryLabel}>Ítems añadidos</span>
            </div>
            <div style={styles.summaryCard}>
              <span style={styles.summaryNumber}>{stats.data.totalFridgeItemsAdded}</span>
              <span style={styles.summaryLabel}>Productos en casa</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Contribución por miembro ── */}
      {stats.data && stats.data.members.length > 0 && (
        <section style={styles.section} aria-labelledby="contrib-heading">
          <h3 id="contrib-heading" style={styles.sectionTitle}>
            👥 Contribución por miembro
          </h3>
          <ul style={styles.contribList} aria-label="Contribución por miembro">
            {stats.data.members.map((member) => (
              <MemberContributionRow
                key={member.userId}
                member={member}
                maxItems={maxItems}
                maxTasks={maxTasks}
              />
            ))}
          </ul>
        </section>
      )}

      {stats.isLoading && (
        <p style={styles.muted} aria-busy="true">
          Cargando estadísticas...
        </p>
      )}

      {stats.error && (
        <p role="alert" style={styles.error}>
          No se han podido cargar las estadísticas. Inténtalo de nuevo.
        </p>
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
    gap: 'var(--space-8)',
  },
  pageHeader: {
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-1)',
  },
  pageSubtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
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
  rankList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  rankCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    transition: 'var(--transition-base)',
  },
  rankCardFirst: {
    borderColor: 'var(--color-warning)',
    backgroundColor: 'rgba(217, 119, 6, 0.06)',
  },
  medal: {
    fontSize: '1.75rem',
    width: '2rem',
    textAlign: 'center',
    flexShrink: 0,
  },
  rankInfo: {
    flex: 1,
    minWidth: 0,
  },
  rankName: {
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rankMeta: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-1)',
    flexWrap: 'wrap',
  },
  streakBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-warning)',
    fontWeight: 'var(--font-weight-medium)',
  },
  achievementBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-accent)',
    fontWeight: 'var(--font-weight-medium)',
  },
  pointsBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  pointsNumber: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-accent)',
    lineHeight: '1',
  },
  pointsLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-3)',
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    textAlign: 'center',
  },
  summaryNumber: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-accent)',
  },
  summaryLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    lineHeight: 'var(--line-height-tight)',
  },
  contribList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  contribRow: {
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  contribHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  contribName: {
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
  },
  contribBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  barWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  barHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  barValue: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  barTrack: {
    height: '6px',
    backgroundColor: 'var(--color-surface-overlay)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width var(--transition-slow)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-12)',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
  },
  emptyText: {
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  emptySubtext: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
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
