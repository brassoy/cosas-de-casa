/* ─── Vista presentacional springfield — stats ───────────────────────────────
 *
 * Theme `springfield` (estética cómic pop: bordes gruesos de tinta, hard shadows
 * con offset, colores planos saturados, Bangers/Fredoka/Nunito). MISMA
 * funcionalidad que la vista base: ranking familiar, resumen global del hogar y
 * contribución por miembro, con estados de carga/vacío/error. Solo cambia la
 * ESTÉTICA.
 *
 * Presentacional puro: solo props in / nada out. Sin fetch, sin hooks de datos,
 * sin stores. El read-model lo cablea el container (`StatsPage`).
 *
 * Se conservan helpers, cálculo de barras, nombres accesibles y textos del
 * contrato base (headings, `list` "Ranking familiar"/"Contribución por
 * miembro", estados de carga/vacío/error, racha 🔥, ⭐) para no romper la suite.
 *
 * NOTA: la maqueta del kit (screens/themes/springfield.tsx → Stats) trae textos
 * y contadores HARDCODEADOS ("SPRINGFIELD", números de mock). Aquí se sustituyen
 * por los datos reales que llegan por props. Las clases `.sf-*` viven en
 * shared/theme/themes/springfield.css.
 * ─────────────────────────────────────────────────────────────────────────── */

import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { BadgeDto } from '@cosasdecasa/contracts';
import type { StatsViewProps } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

/** Paleta plana del theme (kit springfield); cicla por posición para teñir
 *  avatares, KPIs y barras de contribución. */
const SF_COLORS = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342', '#E53935'] as const;

function getMedal(rank: number): string {
  return RANK_MEDALS[rank - 1] ?? `#${rank}`;
}

function colorForIndex(i: number): string {
  // `i % length` siempre está en rango; el `!` solo silencia noUncheckedIndexedAccess.
  return SF_COLORS[i % SF_COLORS.length]!;
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
    <div className="sf min-h-[80dvh] px-5 py-8" style={{ background: '#FFF3C4' }}>
      <div className="mx-auto max-w-[520px] space-y-6">
        {/* ── Cabecera ── */}
        <header className="sf-card-y sf-pop relative p-4">
          <span className="sf-sticker">📊 En esta casa</span>
          <h2 className="sf-bangers mt-2 text-4xl leading-none">
            <span aria-hidden="true">📊 </span>Estadísticas del hogar
          </h2>
          <p className="sf-fredoka mt-1 text-sm">Rendimiento y logros de la familia</p>
          <Lightning className="sf-wob absolute -top-3 right-3 w-7" aria-hidden="true" />
        </header>

        {/* ── Ranking ── */}
        <section className="space-y-3" aria-labelledby="ranking-heading">
          <h3 id="ranking-heading" className="sf-bangers text-2xl">
            🏆 Ranking familiar
          </h3>
          {error ? (
            <p role="alert" className="sf-card-g sf-fredoka p-4 text-sm" style={{ background: '#E53935' }}>
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
                {leaderboard.map((entry, i) => {
                  const name = resolveName(entry.displayName, entry.email);
                  const earned = earnedBadgeCount(entry.badges);
                  const color = colorForIndex(i);
                  return (
                    <li key={entry.userId}>
                      <div
                        className={cn('sf-card sf-pop flex items-center gap-3 p-4')}
                        style={entry.rank === 1 ? { background: '#FFF3C4' } : undefined}
                        aria-label={`${getMedal(entry.rank)} ${name}, ${entry.points} puntos`}
                      >
                        <span className="w-8 shrink-0 text-center text-2xl" aria-hidden="true">
                          {getMedal(entry.rank)}
                        </span>
                        <Avatar name={name} size={44} color={color} />
                        <div className="min-w-0 flex-1">
                          <p className="sf-fredoka truncate text-lg">{name}</p>
                          {earned > 0 && (
                            <span
                              className="sf-tag mt-1 inline-flex"
                              style={{ background: '#FFD90F' }}
                              title="Logros desbloqueados"
                            >
                              ⭐ {earned}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-center">
                          <span className="sf-bangers text-2xl leading-none">{entry.points}</span>
                          <span className="text-xs font-bold opacity-60">pts</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </ScreenState>
          )}
        </section>

        {/* ── Resumen global ── */}
        {stats && (
          <section className="space-y-3" aria-labelledby="summary-heading">
            <h3 id="summary-heading" className="sf-bangers text-2xl">
              📈 Resumen del hogar
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Kpi value={stats.totalTasksCompleted} label="Tareas completadas" color="#FFD90F" />
              <Kpi value={stats.totalShoppingItemsAdded} label="Ítems añadidos" color="#70C5FF" />
              <Kpi value={stats.totalFridgeItemsAdded} label="Productos en casa" color="#F48FB1" />
            </div>
          </section>
        )}

        {/* ── Contribución por miembro ── */}
        {stats && members.length > 0 && (
          <section className="space-y-3" aria-labelledby="contrib-heading">
            <h3 id="contrib-heading" className="sf-bangers text-2xl">
              👥 Contribución por miembro
            </h3>
            <ul className="space-y-3" aria-label="Contribución por miembro">
              {members.map((m, i) => {
                const name = resolveName(m.displayName, m.email);
                const earned = earnedBadgeCount(m.badges);
                return (
                  <li key={m.userId}>
                    <div className="sf-card sf-pop space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size={36} color={colorForIndex(i)} />
                        <span className="sf-fredoka truncate text-base">{name}</span>
                        {m.currentStreak > 0 && (
                          <span
                            className="sf-tag"
                            style={{ background: '#E53935', color: '#fff' }}
                            title="Racha activa"
                          >
                            🔥 {m.currentStreak}d
                          </span>
                        )}
                        {earned > 0 && (
                          <span
                            className="sf-tag"
                            style={{ background: '#FFD90F' }}
                            title="Logros desbloqueados"
                          >
                            ⭐ {earned}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <StatBar
                          label="Ítems añadidos"
                          value={m.shoppingItemsAdded + m.fridgeItemsAdded}
                          max={maxItems}
                          color="#70C5FF"
                        />
                        <StatBar
                          label="Tareas completadas"
                          value={m.tasksCompleted}
                          max={maxTasks}
                          color="#7CB342"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Carga del dashboard cuando aún no hay datos (el error ya lo surface el
            ranking arriba: el contrato comparte un único `error`). */}
        {statsLoading && !stats && (
          <p className="sf-fredoka text-sm opacity-70" aria-busy="true">
            Cargando estadísticas...
          </p>
        )}
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

/** Rayo decorativo del kit (cabecera). Puramente ornamental. */
function Lightning(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" {...props}>
      <path
        d="M14 0 L2 18 H10 L8 32 L22 12 H14 Z"
        fill="#FFD90F"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Avatar({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <div
      className="sf-bangers grid shrink-0 place-items-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.5),
        background: color,
        border: '3px solid #1A1A1A',
        boxShadow: '3px 3px 0 #1A1A1A',
        color: '#1A1A1A',
      }}
    >
      <span>{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function Kpi({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="sf-card flex flex-col items-center gap-1 p-3 text-center" style={{ background: color }}>
      <span className="sf-bangers text-3xl leading-none">{value}</span>
      <span className="sf-fredoka text-xs leading-tight">{label}</span>
    </div>
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
        <span className="sf-fredoka text-xs opacity-70">{label}</span>
        <span className="sf-bangers text-sm">{value}</span>
      </div>
      <div
        className="h-4 overflow-hidden rounded-full bg-white"
        style={{ border: '3px solid #1A1A1A' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
