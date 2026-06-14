/**
 * Vista presentacional `base` (estética shadcn del kit) para la pantalla `stats`.
 *
 * Presentacional pura: SOLO props in / nada out. Sin fetch, sin hooks de datos,
 * sin stores. El read-model lo cablea el container (`StatsPage`).
 *
 * Porta el JSX del componente base del kit (Card shadcn, ScreenState, Flame)
 * reconciliado con los DTOs reales: cuenta logros por `earnedAt` y calcula las
 * barras relativas (porcentajes) aquí, a partir de los datos.
 *
 * Se conservan los nombres accesibles y textos del container actual (headings,
 * `list` "ranking"/"contribución", estados de carga/vacío/error, racha 🔥, ⭐)
 * para no romper la suite de la feature.
 */

import { Card } from '@/shared/ui/card';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { BadgeDto } from '@cosasdecasa/contracts';
import type { StatsViewProps } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

function getMedal(rank: number): string {
  return RANK_MEDALS[rank - 1] ?? `#${rank}`;
}

function resolveName(displayName: string | null, email: string): string {
  return displayName ?? email;
}

function earnedBadgeCount(badges: BadgeDto[]): number {
  return badges.filter((b) => b.earnedAt !== null).length;
}

// ── Vista principal ─────────────────────────────────────────────────────────

export default function StatsView({
  leaderboard,
  stats,
  leaderboardLoading,
  statsLoading,
  error,
}: StatsViewProps) {
  const members = stats?.members ?? [];
  const maxItems = Math.max(1, ...members.map((m) => m.shoppingItemsAdded + m.fridgeItemsAdded));
  const maxTasks = Math.max(1, ...members.map((m) => m.tasksCompleted));

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <header className="border-b border-border pb-4">
        <h2 className="text-3xl font-bold">
          <span aria-hidden="true">📊 </span>Estadísticas del hogar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Rendimiento y logros de la familia</p>
      </header>

      {/* ── Ranking ── */}
      <section className="space-y-4" aria-labelledby="ranking-heading">
        <h3 id="ranking-heading" className="text-lg font-semibold">
          🏆 Ranking familiar
        </h3>
        {error ? (
          <p role="alert" className="rounded-md border border-error bg-error/10 p-3 text-sm text-error">
            {error}
          </p>
        ) : (
        <ScreenState
          isLoading={leaderboardLoading}
          isEmpty={leaderboard.length === 0}
          emptyIcon={<span className="text-4xl">🏅</span>}
          emptyTitle="Todavía no hay actividad. Completa tareas y añade ítems para aparecer en el ranking."
        >
          <ol className="space-y-3" aria-label="Ranking familiar">
            {leaderboard.map((entry) => {
              const name = resolveName(entry.displayName, entry.email);
              const earned = earnedBadgeCount(entry.badges);
              return (
                <li key={entry.userId}>
                  <Card
                    className={cn(
                      'flex items-center gap-3 p-4',
                      entry.rank === 1 && 'border-warning',
                    )}
                    aria-label={`${getMedal(entry.rank)} ${name}, ${entry.points} puntos`}
                  >
                    <span className="w-8 shrink-0 text-center text-2xl" aria-hidden="true">
                      {getMedal(entry.rank)}
                    </span>
                    <Avatar name={name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{name}</p>
                      {earned > 0 && (
                        <span className="mt-1 inline-flex text-xs font-medium text-accent" title="Logros desbloqueados">
                          ⭐ {earned}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-center">
                      <span className="text-xl font-bold leading-none text-accent">{entry.points}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        </ScreenState>
        )}
      </section>

      {/* ── Resumen global ── */}
      {stats && (
        <section className="space-y-4" aria-labelledby="summary-heading">
          <h3 id="summary-heading" className="text-lg font-semibold">
            📈 Resumen del hogar
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Kpi value={stats.totalTasksCompleted} label="Tareas completadas" />
            <Kpi value={stats.totalShoppingItemsAdded} label="Ítems añadidos" />
            <Kpi value={stats.totalFridgeItemsAdded} label="Productos en casa" />
          </div>
        </section>
      )}

      {/* ── Contribución por miembro ── */}
      {stats && members.length > 0 && (
        <section className="space-y-4" aria-labelledby="contrib-heading">
          <h3 id="contrib-heading" className="text-lg font-semibold">
            👥 Contribución por miembro
          </h3>
          <ul className="space-y-4" aria-label="Contribución por miembro">
            {members.map((m) => {
              const name = resolveName(m.displayName, m.email);
              const earned = earnedBadgeCount(m.badges);
              return (
                <li key={m.userId}>
                  <Card className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} size={36} />
                      <span className="truncate text-sm font-semibold">{name}</span>
                      {m.currentStreak > 0 && (
                        <span className="text-xs font-medium text-warning" title="Racha activa">
                          🔥 {m.currentStreak}d
                        </span>
                      )}
                      {earned > 0 && (
                        <span className="text-xs font-medium text-accent" title="Logros desbloqueados">
                          ⭐ {earned}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <StatBar
                        label="Ítems añadidos"
                        value={m.shoppingItemsAdded + m.fridgeItemsAdded}
                        max={maxItems}
                        color="bg-info"
                      />
                      <StatBar
                        label="Tareas completadas"
                        value={m.tasksCompleted}
                        max={maxTasks}
                        color="bg-success"
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Carga del dashboard cuando aún no hay datos (el error ya lo surface el
          ranking arriba: el contrato comparte un único `error`). */}
      {statsLoading && !stats && (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Cargando estadísticas...
        </p>
      )}
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle font-bold text-accent"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      <span>{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <Card className="flex flex-col items-center gap-1 p-4 text-center">
      <span className="text-2xl font-bold text-accent">{value}</span>
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
    </Card>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{value}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
