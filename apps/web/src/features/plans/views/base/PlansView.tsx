/**
 * PlansView — vista presentacional `base` (shadcn) del listado de planes.
 *
 * Porta el JSX del componente base del kit (Lovable `PlansPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con `PlanSummaryDto`
 * real y delegando los estados loading/error/empty en `ScreenState`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { Calendar, MapPin, Plus, Users } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { PlanStatus } from '../../contracts';
import type { PlansViewProps } from '../types';

const STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<PlanStatus, string> = {
  proposed: 'bg-warning/15 text-warning',
  confirmed: 'bg-success/15 text-success',
  cancelled: 'bg-error/15 text-error',
};

export default function PlansView(props: PlansViewProps) {
  const { plans, isLoading, error, onCreate, onOpen } = props;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Planes</h1>
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nuevo plan
        </Button>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={!plans.length}
        emptyTitle="No hay planes todavía."
        emptyCta={{ label: 'Crear plan', onClick: onCreate }}
      >
        <ul className="space-y-2 list-none p-0 m-0">
          {plans.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="w-full text-left cursor-pointer"
              >
                <Card className="p-4 space-y-2 transition-colors hover:bg-muted">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{p.title}</p>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                        STATUS_COLOR[p.status],
                      )}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                </Card>
              </button>
            </li>
          ))}
        </ul>
      </ScreenState>
    </div>
  );
}
