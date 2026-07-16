/**
 * RoutineStatsView — vista presentacional `base` de estadísticas de rutinas.
 *
 * Estadísticas globales de TODAS las rutinas, filtrables por rango de fechas:
 * totales (rutinas, tiempos, incidencias, cumplimiento), horas por item y por
 * tag. Barras en CSS puro (patrón budget/SpendView, sin librerías de charts).
 *
 * Presentacional puro: solo props in / callbacks out (contrato en ../types).
 */

import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { formatMinutes } from '../../types';
import type { RoutineStatsViewProps } from '../types';

export default function RoutineStatsView(props: RoutineStatsViewProps) {
  const { stats, isLoading, error, from, to, onChangeRange, onBack } = props;

  const maxItem = Math.max(1, ...(stats?.perItem.map((i) => i.plannedMinutes) ?? []));
  const maxTag = Math.max(1, ...(stats?.perTag.map((t) => t.plannedMinutes) ?? []));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground">
          ‹ Rutinas
        </button>
        <h1 className="text-2xl font-bold">Estadísticas de rutinas</h1>
      </div>

      {/* ── Filtro por fechas ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="stats-from">Desde</Label>
          <Input
            id="stats-from"
            type="date"
            value={from}
            onChange={(e) => onChangeRange(e.target.value, to)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stats-to">Hasta</Label>
          <Input
            id="stats-to"
            type="date"
            value={to}
            onChange={(e) => onChangeRange(from, e.target.value)}
          />
        </div>
      </div>

      <ScreenState isLoading={isLoading} error={error}>
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatTile label="Rutinas" value={String(stats.totals.routineCount)} />
              <StatTile label="Planificado" value={formatMinutes(stats.totals.plannedMinutes)} />
              <StatTile label="Real" value={formatMinutes(stats.totals.actualMinutes)} />
              <StatTile
                label="Perdido"
                value={formatMinutes(stats.totals.lostMinutes)}
                tone={stats.totals.lostMinutes > 0 ? 'warning' : undefined}
              />
              <StatTile
                label="Incidencias"
                value={String(stats.totals.incidentCount)}
                tone={stats.totals.incidentCount > 0 ? 'warning' : undefined}
              />
              <StatTile
                label="Cumplimiento"
                value={`${Math.round(stats.totals.complianceRate * 100)}%`}
                tone={stats.totals.complianceRate < 1 ? 'warning' : 'success'}
              />
            </div>

            {stats.perItem.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-semibold">Por item</h2>
                <ul className="m-0 list-none space-y-3 p-0">
                  {stats.perItem.map((item) => (
                    <li key={item.routineItemId} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {item.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {item.routineCount} rutina{item.routineCount !== 1 && 's'} ·{' '}
                            {item.assignedTotal}/{item.targetTotal} asignaciones (
                            {Math.round(item.complianceRate * 100)}%)
                          </span>
                        </span>
                        <span className="shrink-0 font-medium">
                          {formatMinutes(item.actualMinutes)}
                          {item.lostMinutes > 0 && (
                            <span className="text-warning"> · −{formatMinutes(item.lostMinutes)}</span>
                          )}
                        </span>
                      </div>
                      <Bar pct={Math.round((item.plannedMinutes / maxItem) * 100)} />
                      {item.incidentCount > 0 && (
                        <p className="text-xs text-warning">
                          ⚠️ {item.incidentCount} incidencia{item.incidentCount !== 1 && 's'}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {stats.perTag.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-semibold">Por tag</h2>
                <ul className="m-0 list-none space-y-3 p-0">
                  {stats.perTag.map((tag) => (
                    <li key={tag.tag} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span>#{tag.tag}</span>
                        <span className="font-medium">
                          {formatMinutes(tag.actualMinutes)}
                          {tag.lostMinutes > 0 && (
                            <span className="text-warning"> · −{formatMinutes(tag.lostMinutes)}</span>
                          )}
                        </span>
                      </div>
                      <Bar pct={Math.round((tag.plannedMinutes / maxTag) * 100)} colorClass="bg-info" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {stats.totals.routineCount === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay rutinas en el rango elegido.
              </p>
            )}
          </>
        )}
      </ScreenState>
    </div>
  );
}

function StatTile({
  label, value, tone,
}: {
  label: string;
  value: string;
  tone?: 'warning' | 'success';
}) {
  return (
    <Card className="p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-bold',
          tone === 'warning' && 'text-warning',
          tone === 'success' && 'text-success',
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function Bar({ pct, colorClass = 'bg-primary' }: { pct: number; colorClass?: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn('h-full', colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}
