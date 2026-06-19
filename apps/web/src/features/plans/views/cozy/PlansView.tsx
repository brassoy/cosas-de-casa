/**
 * PlansView — vista presentacional `cozy` (cuaderno manuscrito) del listado de planes.
 *
 * Misma funcionalidad y contrato que la vista base (`PlansViewProps`): solo cambia
 * la estética. Reproduce el look del kit estático (clases `.ck-*` de
 * `shared/theme/themes/cozy.css`): notas de papel crema clavadas con chinchetas,
 * sello inclinado para el estado, tipografía manuscrita Caveat para los títulos y
 * botón rojo de boli para crear.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. `ScreenState` (loading/error/empty) es
 * agnóstico al theme; resuelve sus colores vía los tokens de `cozy`.
 */

import { Calendar, MapPin, Plus, Users } from 'lucide-react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { PlanStatus } from '../../contracts';
import type { PlansViewProps } from '../types';

const STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

/** Color de tinta del sello de estado (paleta del cuaderno). */
const STATUS_STAMP: Record<PlanStatus, string> = {
  proposed: 'var(--color-accent)',
  confirmed: 'var(--color-success)',
  cancelled: 'var(--color-error)',
};

/** Tonos de chincheta del kit. Indexados cíclicamente por nota. */
const PIN_COLORS = [
  'var(--color-error)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  '#8e44ad',
];

/** Color de chincheta tipado a string (evita T|undefined con noUncheckedIndexedAccess). */
const pinColor = (i: number): string => PIN_COLORS[i % PIN_COLORS.length]!;

export default function PlansView(props: PlansViewProps) {
  const { plans, isLoading, error, onCreate, onOpen } = props;

  return (
    <div className="ck px-5">
      {/* ── Cabecera del cuaderno ──────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <div className="flex items-end justify-center gap-2 mt-1">
          <h1
            className="ck-marker text-5xl leading-none"
            style={{ color: 'var(--color-accent)' }}
          >
            Planes
          </h1>
          <span className="ck-tag mb-1 shrink-0">
            {plans.length} {plans.length === 1 ? 'plan' : 'planes'}
          </span>
        </div>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={!plans.length}
        emptyTitle="No hay planes todavía."
        emptyCta={{ label: 'Crear plan', onClick: onCreate }}
      >
        <div className="space-y-4">
          {plans.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              className="ck-card w-full text-left p-4"
              style={{ transform: `rotate(${((i % 3) - 1) * 0.4}deg)` }}
            >
              <span
                className="ck-pin"
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${pinColor(i)})`,
                }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <p
                  className="ck-marker text-2xl leading-tight"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {p.title}
                </p>
                <span
                  className="ck-stamp shrink-0"
                  style={{ color: STATUS_STAMP[p.status], borderColor: STATUS_STAMP[p.status] }}
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm opacity-80">
                {p.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(p.scheduledAt).toLocaleString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {p.placeName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {p.placeName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {p.participantCount}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScreenState>

      {plans.length > 0 && (
        <button
          type="button"
          className="ck-btn ck-btn-red w-full mt-6 flex items-center justify-center gap-2"
          onClick={onCreate}
        >
          <Plus className="h-5 w-5" />
          Crear plan
        </button>
      )}
    </div>
  );
}
