/**
 * PlansView — vista presentacional `springfield` (cómic pop) del listado de planes.
 *
 * Misma funcionalidad y contrato que la vista base (`PlansViewProps`): solo cambia
 * la estética. Reproduce el look del kit estático (clases `.sf-*` de
 * `shared/theme/themes/springfield.css`): cabecera amarilla de viñeta con pegatina
 * y rayo, tarjetas con borde de tinta + hard shadow, tags de estado por color y
 * botón rojo de cómic.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. `ScreenState` (loading/error/empty) es
 * agnóstico al theme; resuelve sus colores vía los tokens de `springfield`.
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

/** Color del tag según estado (paleta de cómic del theme). */
const STATUS_TAG: Record<PlanStatus, { background: string; color: string }> = {
  proposed: { background: 'var(--color-accent)', color: 'var(--color-text)' },
  confirmed: { background: 'var(--color-success)', color: 'var(--color-text-inverse)' },
  cancelled: { background: 'var(--color-error)', color: 'var(--color-text-inverse)' },
};

export default function PlansView(props: PlansViewProps) {
  const { plans, isLoading, error, onCreate, onOpen } = props;

  return (
    <div className="sf px-5">
      {/* ── Cabecera amarilla de viñeta + pegatina ─────────────────────────── */}
      <div className="sf-card-y p-4 mb-5 relative sf-pop">
        <span className="sf-sticker">¡A planear!</span>
        <div className="flex items-end justify-between gap-2 mt-2">
          <h1 className="sf-bangers text-4xl leading-none">Planes</h1>
          <span className="sf-tag shrink-0">
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
        <div className="space-y-3">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              className="sf-card w-full text-left p-4 sf-wob"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="sf-bangers text-xl leading-tight">{p.title}</p>
                <span className="sf-tag shrink-0" style={STATUS_TAG[p.status]}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold opacity-70">
                {p.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
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
                    <MapPin className="h-3 w-3" />
                    {p.placeName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
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
          className="sf-btn sf-btn-r w-full text-lg mt-5 flex items-center justify-center gap-2"
          onClick={onCreate}
        >
          <Plus className="h-5 w-5" />
          Crear plan
        </button>
      )}
    </div>
  );
}
