/**
 * RoutineKanban — kanban de 7 columnas (los días de la rutina).
 *
 * Interacciones (ambas conviven):
 *  - Drag & drop con @dnd-kit (PointerSensor con distancia y TouchSensor con
 *    delay para no secuestrar el scroll en móvil): arrastrar un chip pendiente
 *    a una columna asigna; arrastrar una tarjeta entre columnas la mueve.
 *  - Tap-para-asignar: tocar un chip lo deja "armado" y tocar una columna
 *    asigna ahí (red de seguridad táctil). Tocar una tarjeta abre su editor.
 *
 * Presentacional: recibe la rutina y callbacks; no conoce las mutaciones.
 */

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { cn } from '@/shared/lib/cn';
import type { RoutineAssignmentDto, RoutineDto, RoutineSelectionDto } from '../types';
import { formatMinutes, routineDayDate, shortDateLabel, weekdayLabel } from '../types';

interface RoutineKanbanProps {
  routine: RoutineDto;
  onAssign: (routineItemId: string, dayIndex: number) => void;
  onMoveAssignment: (assignmentId: string, dayIndex: number) => void;
  onOpenAssignment: (assignment: RoutineAssignmentDto) => void;
}

type DragData =
  | { type: 'pending'; routineItemId: string }
  | { type: 'assignment'; assignmentId: string };

// ── Chip de item pendiente (bandeja superior) ────────────────────────────────

function PendingChip({
  selection,
  isArmed,
  onTap,
}: {
  selection: RoutineSelectionDto;
  isArmed: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pending-${selection.routineItemId}`,
    data: { type: 'pending', routineItemId: selection.routineItemId } satisfies DragData,
  });
  const missing = selection.targetTimesPerWeek - selection.assignedCount;
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onTap}
      {...listeners}
      {...attributes}
      className={cn(
        'flex shrink-0 cursor-grab touch-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        selection.isCompliant
          ? 'border-border bg-surface-raised text-muted-foreground'
          : 'border-warning/40 bg-warning/10',
        isArmed && 'ring-2 ring-primary',
        isDragging && 'opacity-40',
      )}
      aria-pressed={isArmed}
      title={
        selection.isCompliant
          ? 'Objetivo cumplido; puedes asignar más días'
          : `Faltan ${missing} día(s) para cumplir la regla`
      }
    >
      <span className="max-w-[10rem] truncate">{selection.name}</span>
      <span
        className={cn(
          'rounded-full px-1.5 text-xs font-semibold',
          selection.isCompliant ? 'bg-success/15 text-success' : 'bg-warning/20 text-warning',
        )}
      >
        {selection.assignedCount}/{selection.targetTimesPerWeek}
      </span>
      {!selection.isCompliant && <span aria-hidden>⚠️</span>}
    </button>
  );
}

// ── Tarjeta de asignación ─────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  name,
  onOpen,
}: {
  assignment: RoutineAssignmentDto;
  name: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assignment-${assignment.id}`,
    data: { type: 'assignment', assignmentId: assignment.id } satisfies DragData,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(e) => {
        // No burbujear a la columna: con un chip "armado" asignaría además
        // de abrir el editor de la tarjeta.
        e.stopPropagation();
        onOpen();
      }}
      {...listeners}
      {...attributes}
      className={cn(
        'w-full cursor-grab touch-none rounded-card border border-border bg-background p-2 text-left text-xs shadow-sm transition-colors hover:border-primary/40',
        isDragging && 'opacity-40',
      )}
    >
      <p className="truncate font-medium">{name}</p>
      <p className="text-muted-foreground">
        {assignment.startTime}–{assignment.endTime}
        {assignment.endTime <= assignment.startTime && ' (+1d)'}
        {' · '}
        {formatMinutes(assignment.durationMinutes)}
      </p>
      {assignment.incidents.length > 0 && (
        <p className="mt-0.5 text-warning">
          ⚠️ {assignment.incidents.length} incidencia{assignment.incidents.length > 1 && 's'}
        </p>
      )}
    </button>
  );
}

// ── Columna de día ────────────────────────────────────────────────────────────

function DayColumn({
  dayIndex,
  date,
  isToday,
  children,
  armed,
  onTapColumn,
}: {
  dayIndex: number;
  date: string;
  isToday: boolean;
  children: React.ReactNode;
  armed: boolean;
  onTapColumn: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });
  return (
    <div
      ref={setNodeRef}
      onClick={armed ? onTapColumn : undefined}
      className={cn(
        'flex min-h-[10rem] w-36 shrink-0 flex-col gap-1.5 rounded-card border border-border bg-surface-raised/50 p-2',
        isOver && 'border-primary bg-primary/5',
        armed && 'cursor-pointer border-dashed border-primary/60',
      )}
    >
      <div
        className={cn(
          'text-center text-xs font-semibold capitalize',
          isToday ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {weekdayLabel(date)}
        <span className="block text-[11px] font-normal">{shortDateLabel(date)}</span>
      </div>
      {children}
      {armed && (
        <p className="mt-auto text-center text-[11px] text-primary">Toca para asignar aquí</p>
      )}
    </div>
  );
}

// ── Kanban ────────────────────────────────────────────────────────────────────

export function RoutineKanban({
  routine,
  onAssign,
  onMoveAssignment,
  onOpenAssignment,
}: RoutineKanbanProps) {
  const [armedItemId, setArmedItemId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ label: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const nameByItem = new Map(routine.selections.map((s) => [s.routineItemId, s.name]));
  const todayYMD = new Date().toLocaleDateString('sv-SE'); // "YYYY-MM-DD" local

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (!data) return;
    const label =
      data.type === 'pending'
        ? (nameByItem.get(data.routineItemId) ?? '')
        : (nameByItem.get(
            routine.assignments.find((a) => a.id === data.assignmentId)?.routineItemId ?? '',
          ) ?? '');
    setDragging({ label });
    setArmedItemId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const data = event.active.data.current as DragData | undefined;
    const overId = event.over?.id;
    if (!data || typeof overId !== 'string' || !overId.startsWith('day-')) return;
    const dayIndex = Number(overId.slice(4));
    if (data.type === 'pending') {
      onAssign(data.routineItemId, dayIndex);
    } else {
      const current = routine.assignments.find((a) => a.id === data.assignmentId);
      if (current && current.dayIndex !== dayIndex) {
        onMoveAssignment(data.assignmentId, dayIndex);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {/* ── Bandeja de items de la semana ── */}
      {routine.selections.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {routine.selections.map((selection) => (
            <PendingChip
              key={selection.routineItemId}
              selection={selection}
              isArmed={armedItemId === selection.routineItemId}
              onTap={() =>
                setArmedItemId((prev) =>
                  prev === selection.routineItemId ? null : selection.routineItemId,
                )
              }
            />
          ))}
        </div>
      )}

      {/* ── 7 columnas ── */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 7 }, (_, dayIndex) => {
          const date = routineDayDate(routine.startDate, dayIndex);
          const dayAssignments = routine.assignments
            .filter((a) => a.dayIndex === dayIndex)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <DayColumn
              key={dayIndex}
              dayIndex={dayIndex}
              date={date}
              isToday={date === todayYMD}
              armed={armedItemId !== null}
              onTapColumn={() => {
                if (armedItemId) {
                  onAssign(armedItemId, dayIndex);
                  setArmedItemId(null);
                }
              }}
            >
              {dayAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  name={nameByItem.get(assignment.routineItemId) ?? 'Item'}
                  onOpen={() => onOpenAssignment(assignment)}
                />
              ))}
            </DayColumn>
          );
        })}
      </div>

      <DragOverlay>
        {dragging && (
          <div className="rounded-card border border-primary bg-background px-3 py-1.5 text-sm shadow-lg">
            {dragging.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
