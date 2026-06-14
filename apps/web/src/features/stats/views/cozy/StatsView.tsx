/* ─── Vista presentacional cozy — stats ──────────────────────────────────────
 *
 * Theme `cozy` (estética de cuaderno manuscrito: papel crema pautado, tinta
 * marrón, boli azul, notas con cinta y chinchetas, fuentes Caveat/Patrick Hand).
 * MISMA funcionalidad que la vista base: ranking familiar, resumen global del
 * hogar y contribución por miembro, con estados de carga/vacío/error. Solo
 * cambia la ESTÉTICA.
 *
 * Presentacional puro: solo props in / nada out. Sin fetch, sin hooks de datos,
 * sin stores. El read-model lo cablea el container (`StatsPage`).
 *
 * Se conservan helpers, cálculo de barras, nombres accesibles y textos del
 * contrato base (headings, `list` "Ranking familiar"/"Contribución por
 * miembro", estados de carga/vacío/error, racha 🔥, ⭐) para no romper la suite.
 *
 * NOTA: la maqueta del kit (screens/themes/cozy.tsx → Stats) trae textos y
 * contadores HARDCODEADOS ("cómo va la casa", mockLeaderboard, mockStats). Aquí
 * se sustituyen por los datos reales que llegan por props. Las clases `.ck-*`
 * viven en shared/theme/themes/cozy.css.
 * ─────────────────────────────────────────────────────────────────────────── */

import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { BadgeDto } from '@cosasdecasa/contracts';
import type { StatsViewProps } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

/** Paleta de chinchetas del theme (kit cozy); cicla por posición para teñir
 *  avatares, rangos y barras de contribución. */
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'] as const;

/** Tintas crudas del cuaderno (sin var semántica) para acentos manuscritos. */
const INK = { blue: '#2d4a8a', red: '#c0392b', green: '#5b8a3a', yellow: '#e3a51a' } as const;

function getMedal(rank: number): string {
  return RANK_MEDALS[rank - 1] ?? `#${rank}`;
}

function pinForIndex(i: number): string {
  // `i % length` siempre está en rango; el `!` solo silencia noUncheckedIndexedAccess.
  return PINS[i % PINS.length]!;
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
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="mx-auto max-w-[520px] space-y-6">
        {/* ── Cabecera ── */}
        <header className="relative text-center">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h2 className="ck-marker text-5xl leading-none" style={{ color: INK.blue }}>
            <span aria-hidden="true">📊 </span>Estadísticas del hogar
          </h2>
          <p className="mt-2 text-base opacity-80">Rendimiento y logros de la familia</p>
        </header>

        {/* ── Ranking ── */}
        <section className="space-y-3" aria-labelledby="ranking-heading">
          <h3 id="ranking-heading" className="ck-marker text-3xl" style={{ color: INK.blue }}>
            🏆 Ranking familiar
          </h3>
          {error ? (
            <div className="ck-card relative p-4">
              <span className="ck-tape" aria-hidden="true" />
              <p role="alert" className="text-base font-semibold" style={{ color: INK.red }}>
                {error}
              </p>
            </div>
          ) : (
            <ScreenState
              isLoading={leaderboardLoading}
              isEmpty={leaderboard.length === 0}
              emptyIcon={<span className="text-4xl">🏅</span>}
              emptyTitle="Todavía no hay actividad. Completa tareas y añade ítems para aparecer en el ranking."
            >
              <ol className="ck-card space-y-0 p-3" aria-label="Ranking familiar">
                {leaderboard.map((entry, i) => {
                  const name = resolveName(entry.displayName, entry.email);
                  const earned = earnedBadgeCount(entry.badges);
                  const color = pinForIndex(i);
                  return (
                    <li
                      key={entry.userId}
                      className={cn(
                        'flex items-center gap-3 border-b border-dashed py-2 last:border-0',
                        entry.rank === 1 && 'rounded px-2',
                      )}
                      style={{
                        borderColor: 'rgba(217, 199, 154, 0.6)',
                        ...(entry.rank === 1 ? { background: 'rgba(227, 165, 26, 0.12)' } : {}),
                      }}
                      aria-label={`${getMedal(entry.rank)} ${name}, ${entry.points} puntos`}
                    >
                      <span
                        className="ck-marker w-8 shrink-0 text-center text-3xl leading-none"
                        style={{ color }}
                        aria-hidden="true"
                      >
                        {getMedal(entry.rank)}
                      </span>
                      <Avatar name={name} size={40} color={color} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg">{name}</p>
                        {earned > 0 && (
                          <span
                            className="ck-tag mt-1 inline-flex"
                            style={{ background: INK.yellow }}
                            title="Logros desbloqueados"
                          >
                            ⭐ {earned}
                          </span>
                        )}
                      </div>
                      <span className="ck-tag shrink-0" style={{ background: INK.yellow }}>
                        {entry.points} pt
                      </span>
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
            <h3 id="summary-heading" className="ck-marker text-3xl" style={{ color: INK.blue }}>
              📈 Resumen del hogar
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Kpi value={stats.totalTasksCompleted} label="Tareas completadas" color={INK.blue} />
              <Kpi value={stats.totalShoppingItemsAdded} label="Ítems añadidos" color={INK.yellow} />
              <Kpi value={stats.totalFridgeItemsAdded} label="Productos en casa" color={INK.green} />
            </div>
          </section>
        )}

        {/* ── Contribución por miembro ── */}
        {stats && members.length > 0 && (
          <section className="space-y-3" aria-labelledby="contrib-heading">
            <h3 id="contrib-heading" className="ck-marker text-3xl" style={{ color: INK.blue }}>
              👥 Contribución por miembro
            </h3>
            <ul className="space-y-3" aria-label="Contribución por miembro">
              {members.map((m, i) => {
                const name = resolveName(m.displayName, m.email);
                const earned = earnedBadgeCount(m.badges);
                return (
                  <li key={m.userId}>
                    <div className="ck-card space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size={36} color={pinForIndex(i)} />
                        <span className="ck-marker truncate text-2xl">{name}</span>
                        {m.currentStreak > 0 && (
                          <span
                            className="ck-tag"
                            style={{ background: INK.red, color: '#fff' }}
                            title="Racha activa"
                          >
                            🔥 {m.currentStreak}d
                          </span>
                        )}
                        {earned > 0 && (
                          <span
                            className="ck-tag"
                            style={{ background: INK.yellow }}
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
                          color={INK.blue}
                        />
                        <StatBar
                          label="Tareas completadas"
                          value={m.tasksCompleted}
                          max={maxTasks}
                          color={INK.green}
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
          <p className="text-base opacity-70" aria-busy="true">
            Cargando estadísticas...
          </p>
        )}
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function Avatar({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <div
      className="ck-marker grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5), background: color }}
    >
      <span>{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function Kpi({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="ck-card p-3 text-center">
      <p className="ck-marker text-4xl leading-none" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-sm opacity-70">{label}</p>
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
        <span className="text-sm opacity-70">{label}</span>
        <span className="ck-marker text-lg leading-none">{value}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full"
        style={{ background: '#e8d9b8' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
