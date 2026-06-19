/**
 * PlansView — vista presentacional `cozysitcom` (sitcom retro 70s) del listado de planes.
 *
 * Misma funcionalidad y contrato que la vista base (`PlansViewProps`): solo cambia
 * la estética. Reproduce el look del kit estático (clases `.cz-*` de
 * `shared/theme/themes/cozysitcom.css`): cabecera de madera, sello, cinta mostaza,
 * marcos de papel crema y botón denim.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. `ScreenState` (loading/error/empty) es
 * agnóstico al theme; resuelve sus colores vía los tokens de `cozysitcom`.
 */

import { Calendar, MapPin, Users } from 'lucide-react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { PlanStatus } from '../../contracts';
import type { PlansViewProps } from '../types';

const STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

/** Color de fondo del tag según estado (paleta retro del theme). */
const STATUS_TAG: Record<PlanStatus, { background: string; color: string }> = {
  proposed: { background: 'var(--color-warning)', color: 'var(--color-text)' },
  confirmed: { background: 'var(--color-success)', color: '#fff' },
  cancelled: { background: 'var(--color-error)', color: '#fff' },
};

export default function PlansView(props: PlansViewProps) {
  const { plans, isLoading, error, onCreate, onOpen } = props;

  return (
    <div className="cz min-h-[80dvh] px-5 py-8">
      {/* ── Cabecera de madera + sello + cinta ─────────────────────────────── */}
      <div className="mb-5 cz-pop">
        <div className="cz-wood inline-block mb-2">
          <p className="cz-serif text-base">Planes</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <h1 className="cz-serif text-4xl leading-none">Planes</h1>
          <span className="cz-stamp">EN CASA</span>
        </div>
        <div className="cz-stripe mt-3" />
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
              className="cz-frame w-full text-left cz-pop"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="cz-serif text-xl leading-tight">{p.title}</p>
                <span className="cz-tag shrink-0" style={STATUS_TAG[p.status]}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-70">
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
        <button type="button" className="cz-btn-denim w-full mt-5" onClick={onCreate}>
          + Crear plan
        </button>
      )}
    </div>
  );
}
