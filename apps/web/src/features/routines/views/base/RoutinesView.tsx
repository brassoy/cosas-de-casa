/**
 * RoutinesView — vista presentacional `base` de la lista de rutinas.
 *
 * Lista las semanas planificadas y abre el modal "Nueva rutina de esta semana":
 * fecha de inicio (cualquier día de la semana), nombre opcional y selección de
 * items del catálogo — o duplicar la última rutina tal cual (sin incidencias).
 *
 * Presentacional puro: solo props in / callbacks out (contrato en ../types).
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { routineDefaultName, shortDateLabel } from '../../types';
import type { RoutinesViewProps } from '../types';

export default function RoutinesView(props: RoutinesViewProps) {
  const {
    routines, catalogItems, isLoading, error,
    isCreateOpen, isSubmitting, submitError, lastRoutine,
    onOpenCreate, onCloseCreate, onCreate,
    onOpenRoutine, onDeleteRoutine, onOpenItems, onOpenStats,
  } = props;

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">🗓️ Rutinas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onOpenItems}>Items</Button>
          <Button variant="outline" size="sm" onClick={onOpenStats}>Estadísticas</Button>
          <Button size="sm" onClick={onOpenCreate}>+ Nueva rutina</Button>
        </div>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={routines.length === 0}
        emptyIcon={<span className="text-3xl">🗓️</span>}
        emptyTitle="Aún no hay rutinas. Crea la de esta semana para empezar."
        emptyCta={{ label: 'Nueva rutina de esta semana', onClick: onOpenCreate }}
      >
        <ul className="m-0 list-none space-y-2 p-0">
          {routines.map((routine) => (
            <li key={routine.id}>
              <Card
                className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40"
                onClick={() => onOpenRoutine(routine.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {routine.name ?? routineDefaultName(routine.startDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {shortDateLabel(routine.startDate)} – {shortDateLabel(routine.endDate)}
                    {' · '}{routine.itemCount} items · {routine.assignmentCount} asignaciones
                    {routine.incidentCount > 0 && (
                      <span className="text-warning"> · ⚠️ {routine.incidentCount}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant={confirmDeleteId === routine.id ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirmDeleteId === routine.id) {
                      onDeleteRoutine(routine.id);
                      setConfirmDeleteId(null);
                    } else {
                      setConfirmDeleteId(routine.id);
                    }
                  }}
                >
                  {confirmDeleteId === routine.id ? '¿Borrar?' : '🗑️'}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </ScreenState>

      <CreateRoutineDialog
        open={isCreateOpen}
        catalogItems={catalogItems}
        lastRoutineId={lastRoutine?.id ?? null}
        lastRoutineLabel={
          lastRoutine ? (lastRoutine.name ?? routineDefaultName(lastRoutine.startDate)) : null
        }
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={onCloseCreate}
        onCreate={onCreate}
      />
    </div>
  );
}

// ── Modal de creación ─────────────────────────────────────────────────────────

function CreateRoutineDialog({
  open, catalogItems, lastRoutineId, lastRoutineLabel, isSubmitting, submitError,
  onClose, onCreate,
}: {
  open: boolean;
  catalogItems: RoutinesViewProps['catalogItems'];
  lastRoutineId: string | null;
  lastRoutineLabel: string | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onCreate: RoutinesViewProps['onCreate'];
}) {
  const todayYMD = new Date().toLocaleDateString('sv-SE');
  const [startDate, setStartDate] = useState(todayYMD);
  const [name, setName] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleItem(itemId: string) {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  }

  function handleSubmit() {
    onCreate({
      startDate,
      name: name.trim() || undefined,
      itemIds: duplicate ? [] : selectedIds,
      duplicateFromRoutineId: duplicate && lastRoutineId ? lastRoutineId : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva rutina de esta semana</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="routine-start">Empieza el día (7 días desde ahí)</Label>
            <Input
              id="routine-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="routine-name">Nombre (opcional)</Label>
            <Input
              id="routine-name"
              value={name}
              placeholder="Rutina escolar, verano…"
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {lastRoutineId && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={duplicate}
                onChange={(e) => setDuplicate(e.target.checked)}
              />
              Duplicar «{lastRoutineLabel}» (items y asignaciones, sin incidencias)
            </label>
          )}

          {!duplicate && (
            <div className="space-y-1.5">
              <Label>Items de esta semana</Label>
              {catalogItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay items en el catálogo: créalos en «Items» (puedes añadirlos después).
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {catalogItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={selectedIds.includes(item.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        selectedIds.includes(item.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface-raised',
                      )}
                    >
                      {item.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {item.targetTimesPerWeek}×
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {submitError && <p className="text-sm text-error">{submitError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !startDate}>
            {isSubmitting ? 'Creando…' : 'Crear rutina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
