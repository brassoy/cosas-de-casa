/* ─── Vista presentacional cozysitcom — stats ───────────────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar: madera, mostaza,
 * denim, granate). MISMA funcionalidad que la vista base: ranking familiar,
 * resumen global del hogar y contribución por miembro, con estados de
 * carga/vacío/error. Solo cambia la ESTÉTICA.
 *
 * Presentacional puro: solo props in / nada out. Sin fetch, sin hooks de datos,
 * sin stores. El read-model lo cablea el container (`StatsPage`).
 *
 * Se conservan helpers, cálculo de barras, nombres accesibles y textos del
 * contrato base (headings, `list` "Ranking familiar"/"Contribución por
 * miembro", estados de carga/vacío/error, racha 🔥, ⭐) para no romper la suite.
 * ─────────────────────────────────────────────────────────────────────────── */

import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { StatsViewProps } from '../types';
import { earnedBadgeCount, getMedal, resolveName } from '../stats-helpers';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Paleta retro del theme; cicla por posición para teñir avatares y rangos. */
const ACCENTS = ['#2F5D8C', '#E3B23C', '#A63A3A', '#5F7A4F', '#8B5E3C'] as const;

function accentForIndex(i: number): string {
  // `i % length` siempre está en rango; el `!` solo silencia noUncheckedIndexedAccess.
  return ACCENTS[i % ACCENTS.length]!;
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
    <div className="cz cz-wallpaper min-h-[80dvh] px-5 py-8">
      <div className="mx-auto max-w-[520px] space-y-6">
        {/* ── Cabecera ── */}
        <header className="cz-pop">
          <div className="cz-wood mb-3 inline-block">
            <p className="cz-serif text-base">En esta casa</p>
          </div>
          <h2 className="cz-serif text-4xl leading-none">
            <span aria-hidden="true">📊 </span>Estadísticas del hogar
          </h2>
          <p className="mt-2 text-sm opacity-70">Rendimiento y logros de la familia</p>
          <div className="cz-stripe mt-3" />
        </header>

        {/* ── Ranking ── */}
        <section className="space-y-3" aria-labelledby="ranking-heading">
          <h3 id="ranking-heading" className="cz-serif text-xl">
            🏆 Ranking familiar
          </h3>
          {error ? (
            <p
              role="alert"
              className="cz-frame text-sm font-semibold"
              style={{ background: '#A63A3A', color: '#fff' }}
            >
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
                  const color = accentForIndex(i);
                  return (
                    <li key={entry.userId}>
                      <div
                        className={cn('cz-frame cz-pop flex items-center gap-3')}
                        style={entry.rank === 1 ? { borderColor: '#E3B23C', borderWidth: 2 } : undefined}
                        aria-label={`${getMedal(entry.rank)} ${name}, ${entry.points} puntos`}
                      >
                        <span className="w-8 shrink-0 text-center text-2xl" aria-hidden="true">
                          {getMedal(entry.rank)}
                        </span>
                        <Avatar name={name} size={44} color={color} />
                        <div className="min-w-0 flex-1">
                          <p className="cz-serif truncate text-lg">{name}</p>
                          {earned > 0 && (
                            <span
                              className="cz-tag mt-1 inline-flex"
                              style={{ background: '#E3B23C' }}
                              title="Logros desbloqueados"
                            >
                              ⭐ {earned}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-center">
                          <span className="cz-serif text-2xl leading-none">{entry.points}</span>
                          <span className="text-xs opacity-70">pts</span>
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
            <h3 id="summary-heading" className="cz-serif text-xl">
              📈 Resumen del hogar
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Kpi value={stats.totalTasksCompleted} label="Tareas completadas" color="#2F5D8C" />
              <Kpi value={stats.totalShoppingItemsAdded} label="Ítems añadidos" color="#E3B23C" />
              <Kpi value={stats.totalFridgeItemsAdded} label="Productos en casa" color="#5F7A4F" />
            </div>
          </section>
        )}

        {/* ── Contribución por miembro ── */}
        {stats && members.length > 0 && (
          <section className="space-y-3" aria-labelledby="contrib-heading">
            <h3 id="contrib-heading" className="cz-serif text-xl">
              👥 Contribución por miembro
            </h3>
            <ul className="space-y-3" aria-label="Contribución por miembro">
              {members.map((m, i) => {
                const name = resolveName(m.displayName, m.email);
                const earned = earnedBadgeCount(m.badges);
                return (
                  <li key={m.userId}>
                    <div className="cz-frame cz-pop space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size={36} color={accentForIndex(i)} />
                        <span className="cz-serif truncate text-base">{name}</span>
                        {m.currentStreak > 0 && (
                          <span
                            className="cz-tag"
                            style={{ background: '#A63A3A', color: '#fff' }}
                            title="Racha activa"
                          >
                            🔥 {m.currentStreak}d
                          </span>
                        )}
                        {earned > 0 && (
                          <span
                            className="cz-tag"
                            style={{ background: '#E3B23C' }}
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
                          color="#2F5D8C"
                        />
                        <StatBar
                          label="Tareas completadas"
                          value={m.tasksCompleted}
                          max={maxTasks}
                          color="#5F7A4F"
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
          <p className="text-sm opacity-70" aria-busy="true">
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
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white font-extrabold text-white shadow"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: color }}
    >
      <span>{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function Kpi({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="cz-frame flex flex-col items-center gap-1 text-center">
      <span className="cz-serif text-3xl" style={{ color }}>
        {value}
      </span>
      <span className="text-xs leading-tight opacity-70">{label}</span>
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
        <span className="text-xs opacity-70">{label}</span>
        <span className="cz-serif text-xs">{value}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full"
        style={{ background: '#F4E3C1' }}
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
