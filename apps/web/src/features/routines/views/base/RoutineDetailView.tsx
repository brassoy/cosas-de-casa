/**
 * RoutineDetailView — vista presentacional `base` del detalle de una rutina.
 *
 * Pestaña «Semana»: kanban de 7 columnas (drag & drop + tap-para-asignar) con
 * bandeja de items y aviso NO bloqueante de reglas sin cumplir. Tocar una
 * tarjeta abre su editor: ventana horaria, borrado e incidencias (descripción +
 * minutos perdidos que se descuentan del tiempo real).
 *
 * Pestaña «Resumen»: tiempos por item («Trabajo ☀️ Pablo = 10h»), por tag y
 * totales con % de cumplimiento.
 *
 * Presentacional puro: solo props in / callbacks out (contrato en ../types).
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { RoutineKanban } from '../../components/RoutineKanban';
import {
  computeDurationMinutes,
  formatMinutes,
  routineDefaultName,
  shortDateLabel,
  weekdayLabel,
} from '../../types';
import type {
  RoutineAssignmentDto,
  RoutineDto,
  RoutineHistoryEntryDto,
  RoutineSummaryDto,
} from '../../types';
import type { RoutineDetailViewProps } from '../types';

export default function RoutineDetailView(props: RoutineDetailViewProps) {
  const {
    routine, summary, history, isHistoryLoading, catalogItems, isLoading, error,
    activeTab, isItemPickerOpen, isMutating, mutationError,
    onChangeTab, onOpenItemPicker, onCloseItemPicker, onSubmitItems,
    onAssign, onMoveAssignment, onUpdateWindow, onDeleteAssignment,
    onCreateIncident, onUpdateIncident, onDeleteIncident, onBack,
  } = props;

  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  // Modo consulta por defecto: nada se arrastra hasta pulsar «Editar».
  const [isEditing, setIsEditing] = useState(false);
  // La asignación abierta se relee de la rutina (la cache optimista la actualiza).
  const openAssignment =
    routine?.assignments.find((a) => a.id === openAssignmentId) ?? null;

  const pendingRules = routine?.selections.filter((s) => !s.isCompliant) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground">
          ‹ Rutinas
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">
            {routine ? (routine.name ?? routineDefaultName(routine.startDate)) : 'Rutina'}
          </h1>
          {routine && (
            <p className="text-sm text-muted-foreground">
              {shortDateLabel(routine.startDate)} – {shortDateLabel(routine.endDate)}
            </p>
          )}
        </div>
      </div>

      <ScreenState isLoading={isLoading} error={error}>
        {routine && (
          <>
            {/* ── Tabs ── */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 rounded-full bg-surface-raised p-1">
                {(['kanban', 'summary', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onChangeTab(tab)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm transition-colors',
                      activeTab === tab
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {tab === 'kanban' ? 'Semana' : tab === 'summary' ? 'Resumen' : 'Historial'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {activeTab === 'kanban' && (
                  <Button
                    variant={isEditing ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={isEditing}
                    onClick={() => setIsEditing((v) => !v)}
                  >
                    {isEditing ? '👁 Consultar' : '✏️ Editar'}
                  </Button>
                )}
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={onOpenItemPicker}>
                    Elegir items
                  </Button>
                )}
              </div>
            </div>

            {mutationError && (
              <p className="rounded-card bg-error/10 px-3 py-2 text-sm text-error">
                {mutationError}
              </p>
            )}

            {/* ── Aviso de reglas sin cumplir (permitido, pero registrado) ── */}
            {pendingRules.length > 0 && (
              <p className="rounded-card bg-warning/10 px-3 py-2 text-sm text-warning">
                ⚠️ Reglas sin cumplir:{' '}
                {pendingRules
                  .map((s) => `${s.name} ${s.assignedCount}/${s.targetTimesPerWeek}`)
                  .join(' · ')}
              </p>
            )}

            {activeTab === 'kanban' ? (
              routine.selections.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Esta semana no tiene items todavía.
                  <div className="mt-3">
                    <Button size="sm" onClick={onOpenItemPicker}>Elegir items</Button>
                  </div>
                </Card>
              ) : (
                <>
                  <RoutineKanban
                    routine={routine}
                    isEditing={isEditing}
                    onAssign={onAssign}
                    onMoveAssignment={onMoveAssignment}
                    onOpenAssignment={(a) => setOpenAssignmentId(a.id)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditing
                      ? 'Arrastra un item a un día (en móvil, mantén pulsado; o toca el item y luego el día). Toca una tarjeta para horario e incidencias.'
                      : 'Modo consulta: pulsa «Editar» para asignar o mover items. Toca una tarjeta para ver su detalle.'}
                  </p>
                </>
              )
            ) : activeTab === 'summary' ? (
              <SummaryPanel summary={summary} routine={routine} />
            ) : (
              <HistoryPanel entries={history} isLoading={isHistoryLoading} />
            )}
          </>
        )}
      </ScreenState>

      {/* ── Selector de items de la semana ── */}
      {routine && (
        <ItemPickerDialog
          // Remonta al abrir/cerrar: la selección inicial sale de props sin
          // efectos (regla react-hooks/set-state-in-effect).
          key={`picker-${isItemPickerOpen}`}
          open={isItemPickerOpen}
          catalogItems={catalogItems}
          selectedIds={routine.selections.map((s) => s.routineItemId)}
          isSubmitting={isMutating}
          onClose={onCloseItemPicker}
          onSubmit={onSubmitItems}
        />
      )}

      {/* ── Editor de asignación + incidencias ── */}
      {openAssignment && (
        <AssignmentDialog
          // Remonta al cambiar de asignación: el formulario se inicializa de
          // props sin efectos (regla react-hooks/set-state-in-effect).
          key={openAssignment.id}
          assignment={openAssignment}
          itemName={
            routine?.selections.find(
              (s) => s.routineItemId === openAssignment.routineItemId,
            )?.name ?? ''
          }
          isMutating={isMutating}
          onClose={() => setOpenAssignmentId(null)}
          onUpdateWindow={onUpdateWindow}
          onDelete={(assignmentId) => {
            onDeleteAssignment(assignmentId);
            setOpenAssignmentId(null);
          }}
          onCreateIncident={onCreateIncident}
          onUpdateIncident={onUpdateIncident}
          onDeleteIncident={onDeleteIncident}
        />
      )}
    </div>
  );
}

// ── Resumen ───────────────────────────────────────────────────────────────────

/** Incidencia aplanada para el desplegable del resumen. */
interface IncidentDetail {
  id: string;
  dayLabel: string;
  description: string;
  lostMinutes: number | null;
}

function SummaryPanel({
  summary,
  routine,
}: {
  summary: RoutineSummaryDto | null;
  routine: RoutineDto | null;
}) {
  if (!summary) {
    return <p className="text-sm text-muted-foreground">Calculando resumen…</p>;
  }
  const maxItem = Math.max(1, ...summary.perItem.map((i) => i.plannedMinutes));
  const maxTag = Math.max(1, ...summary.perTag.map((t) => t.plannedMinutes));

  // Detalle de incidencias por item (el summary solo trae el contador; el
  // detalle vive en las asignaciones de la rutina ya cargada).
  const incidentsByItem = new Map<string, IncidentDetail[]>();
  for (const assignment of routine?.assignments ?? []) {
    for (const incident of assignment.incidents) {
      const list = incidentsByItem.get(assignment.routineItemId) ?? [];
      list.push({
        id: incident.id,
        dayLabel: `${weekdayLabel(assignment.date)} ${shortDateLabel(assignment.date)}`,
        description: incident.description,
        lostMinutes: incident.lostMinutes,
      });
      incidentsByItem.set(assignment.routineItemId, list);
    }
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Planificado" value={formatMinutes(summary.totals.plannedMinutes)} />
        <StatTile label="Real" value={formatMinutes(summary.totals.actualMinutes)} />
        <StatTile
          label="Perdido"
          value={formatMinutes(summary.totals.lostMinutes)}
          tone={summary.totals.lostMinutes > 0 ? 'warning' : undefined}
        />
        <StatTile
          label="Cumplimiento"
          value={`${Math.round(summary.totals.complianceRate * 100)}%`}
          tone={summary.totals.complianceRate < 1 ? 'warning' : 'success'}
        />
      </div>

      {summary.perItem.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Por item</h2>
          <ul className="m-0 list-none space-y-2 p-0">
            {summary.perItem.map((item) => (
              <TimeBar
                key={item.routineItemId}
                label={`${item.name} · ${item.assignedCount}/${item.targetTimesPerWeek}${item.isCompliant ? '' : ' ⚠️'}`}
                planned={item.plannedMinutes}
                actual={item.actualMinutes}
                incidents={item.incidentCount}
                incidentDetails={incidentsByItem.get(item.routineItemId)}
                max={maxItem}
              />
            ))}
          </ul>
        </section>
      )}

      {summary.perTag.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Por tag</h2>
          <ul className="m-0 list-none space-y-2 p-0">
            {summary.perTag.map((tag) => (
              <TimeBar
                key={tag.tag}
                label={`#${tag.tag}`}
                planned={tag.plannedMinutes}
                actual={tag.actualMinutes}
                incidents={tag.incidentCount}
                max={maxTag}
              />
            ))}
          </ul>
        </section>
      )}

      {summary.perItem.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Asigna items a los días para ver el tiempo planificado.
        </p>
      )}
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

/**
 * Barra CSS pura: tiempo real sobre planificado (patrón budget/SpendView).
 * Si hay `incidentDetails`, el icono ⚠️ es pulsable y despliega la lista.
 */
function TimeBar({
  label, planned, actual, incidents, incidentDetails, max,
}: {
  label: string;
  planned: number;
  actual: number;
  incidents: number;
  incidentDetails?: IncidentDetail[];
  max: number;
}) {
  const [showIncidents, setShowIncidents] = useState(false);
  const expandable = (incidentDetails?.length ?? 0) > 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-medium">
          {formatMinutes(actual)}
          {actual !== planned && (
            <span className="text-muted-foreground"> / {formatMinutes(planned)}</span>
          )}
          {incidents > 0 &&
            (expandable ? (
              <button
                type="button"
                className="ml-1 text-warning underline decoration-dotted underline-offset-2"
                aria-expanded={showIncidents}
                aria-label={`Ver ${incidents} incidencia(s)`}
                onClick={() => setShowIncidents((v) => !v)}
              >
                ⚠️{incidents}
              </button>
            ) : (
              <span className="text-warning"> · ⚠️{incidents}</span>
            ))}
        </span>
      </div>
      {showIncidents && expandable && (
        <ul className="m-0 list-none space-y-1 rounded-card bg-warning/10 p-2 text-xs">
          {incidentDetails!.map((incident) => (
            <li key={incident.id} className="flex justify-between gap-2">
              <span className="min-w-0">
                <span className="capitalize text-muted-foreground">{incident.dayLabel}: </span>
                {incident.description}
              </span>
              {incident.lostMinutes !== null && (
                <span className="shrink-0 text-warning">
                  −{formatMinutes(incident.lostMinutes)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={planned === 0 ? 0 : Math.round((actual / planned) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-muted-foreground/30"
          style={{ width: `${Math.round((planned / max) * 100)}%` }}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: planned === 0 ? '0%' : `${Math.round((actual / planned) * 100)}%` }}
          />
        </div>
      </div>
    </li>
  );
}

// ── Historial de cambios ──────────────────────────────────────────────────────

function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HistoryPanel({
  entries,
  isLoading,
}: {
  entries: RoutineHistoryEntryDto[] | null;
  isLoading?: boolean;
}) {
  if (isLoading && !entries) {
    return <p className="text-sm text-muted-foreground">Cargando historial…</p>;
  }
  if (!entries || entries.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Todavía no hay cambios registrados. A partir de ahora, cada modificación de
        esta rutina quedará aquí: quién, qué y cuándo.
      </Card>
    );
  }
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="space-y-1 rounded-card border border-border bg-surface-raised p-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 text-sm font-medium">{entry.summary}</p>
            <time
              dateTime={entry.createdAt}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {formatHistoryDate(entry.createdAt)}
            </time>
          </div>
          <p className="text-xs text-muted-foreground">{entry.createdByName ?? 'Alguien'}</p>
          {entry.changes.length > 0 && (
            <ul className="m-0 mt-1 list-none space-y-1 border-t border-border pt-2 text-xs">
              {entry.changes.map((change, index) => (
                <li key={index} className="flex flex-wrap items-baseline gap-1">
                  <span className="text-muted-foreground">{change.label}:</span>
                  {change.before !== null && (
                    <span
                      className={cn(
                        change.after !== null && 'text-muted-foreground line-through',
                      )}
                    >
                      {change.before}
                    </span>
                  )}
                  {change.before !== null && change.after !== null && (
                    <span aria-hidden="true" className="text-muted-foreground">→</span>
                  )}
                  {change.after !== null && <span className="font-medium">{change.after}</span>}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── Selector de items ─────────────────────────────────────────────────────────

function ItemPickerDialog({
  open, catalogItems, selectedIds, isSubmitting, onClose, onSubmit,
}: {
  open: boolean;
  catalogItems: RoutineDetailViewProps['catalogItems'];
  selectedIds: string[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (itemIds: string[]) => void;
}) {
  // El componente se remonta (key en el padre) al abrir: snapshot de la
  // selección actual como estado inicial, sin efectos.
  const [ids, setIds] = useState<string[]>(selectedIds);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Items de la semana</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Quitar un item elimina también sus asignaciones e incidencias de esta semana.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {catalogItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={ids.includes(item.id)}
              onClick={() =>
                setIds((prev) =>
                  prev.includes(item.id)
                    ? prev.filter((id) => id !== item.id)
                    : [...prev, item.id],
                )
              }
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                ids.includes(item.id)
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              onSubmit(ids);
              onClose();
            }}
          >
            Guardar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Editor de asignación + incidencias ────────────────────────────────────────

function AssignmentDialog({
  assignment, itemName, isMutating, onClose,
  onUpdateWindow, onDelete, onCreateIncident, onUpdateIncident, onDeleteIncident,
}: {
  assignment: RoutineAssignmentDto;
  itemName: string;
  isMutating?: boolean;
  onClose: () => void;
  onUpdateWindow: RoutineDetailViewProps['onUpdateWindow'];
  onDelete: (assignmentId: string) => void;
  onCreateIncident: RoutineDetailViewProps['onCreateIncident'];
  onUpdateIncident: RoutineDetailViewProps['onUpdateIncident'];
  onDeleteIncident: RoutineDetailViewProps['onDeleteIncident'];
}) {
  // El componente se remonta (key=assignment.id en el padre): el formulario se
  // inicializa desde la asignación abierta sin efectos.
  const [startTime, setStartTime] = useState(assignment.startTime);
  const [endTime, setEndTime] = useState(assignment.endTime);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [incidentText, setIncidentText] = useState('');
  const [lostMinutesText, setLostMinutesText] = useState('');
  /** Incidencia cargada en el formulario para editar, o null (creación). */
  const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);
  /** Incidencia pendiente de confirmar su borrado (dos toques). */
  const [confirmIncidentId, setConfirmIncidentId] = useState<string | null>(null);

  function resetIncidentForm() {
    setEditingIncidentId(null);
    setIncidentText('');
    setLostMinutesText('');
  }

  const windowChanged =
    startTime !== assignment.startTime || endTime !== assignment.endTime;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{itemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {new Date(`${assignment.date}T00:00:00`).toLocaleDateString('es-ES', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>

          {/* ── Ventana horaria ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asg-start">Desde</Label>
              <Input
                id="asg-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asg-end">Hasta</Label>
              <Input
                id="asg-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {endTime <= startTime && startTime !== endTime && '🌙 Termina al día siguiente · '}
            {startTime !== endTime && formatMinutes(computeDurationMinutes(startTime, endTime))}
          </p>
          {windowChanged && (
            <Button
              size="sm"
              disabled={isMutating || startTime === endTime}
              onClick={() => onUpdateWindow(assignment.id, startTime, endTime)}
            >
              Guardar horario
            </Button>
          )}

          {/* ── Incidencias ── */}
          <div className="space-y-2 border-t border-border pt-3">
            <h3 className="text-sm font-semibold">Incidencias</h3>
            {assignment.incidents.map((incident) => (
              <div
                key={incident.id}
                className={cn(
                  'flex items-start justify-between gap-2 rounded-card bg-warning/10 p-2 text-sm',
                  editingIncidentId === incident.id && 'ring-1 ring-warning',
                )}
              >
                <div className="min-w-0">
                  <p>{incident.description}</p>
                  {incident.lostMinutes !== null && (
                    <p className="text-xs text-warning">
                      −{formatMinutes(incident.lostMinutes)} de tiempo real
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="text-muted-foreground"
                    aria-label="Editar incidencia"
                    onClick={() => {
                      setEditingIncidentId(incident.id);
                      setIncidentText(incident.description);
                      setLostMinutesText(
                        incident.lostMinutes === null ? '' : String(incident.lostMinutes),
                      );
                      setConfirmIncidentId(null);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'text-muted-foreground',
                      confirmIncidentId === incident.id && 'font-semibold text-error',
                    )}
                    aria-label="Eliminar incidencia"
                    onClick={() => {
                      if (confirmIncidentId === incident.id) {
                        onDeleteIncident(incident.id);
                        setConfirmIncidentId(null);
                        if (editingIncidentId === incident.id) resetIncidentForm();
                      } else {
                        setConfirmIncidentId(incident.id);
                      }
                    }}
                  >
                    {confirmIncidentId === incident.id ? '¿Borrar?' : '✕'}
                  </button>
                </div>
              </div>
            ))}
            <Textarea
              value={incidentText}
              placeholder="¿Qué no se ha cumplido?"
              maxLength={1000}
              onChange={(e) => setIncidentText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                max={assignment.durationMinutes}
                value={lostMinutesText}
                placeholder="Minutos perdidos"
                className="max-w-[10rem]"
                onChange={(e) => setLostMinutesText(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={isMutating || !incidentText.trim()}
                onClick={() => {
                  const text = incidentText.trim();
                  if (editingIncidentId) {
                    const lost = lostMinutesText === '' ? null : Number(lostMinutesText);
                    onUpdateIncident(editingIncidentId, text, lost);
                  } else {
                    const lost = lostMinutesText === '' ? undefined : Number(lostMinutesText);
                    onCreateIncident(assignment.id, text, lost);
                  }
                  resetIncidentForm();
                }}
              >
                {editingIncidentId ? 'Guardar cambios' : 'Abrir incidencia'}
              </Button>
              {editingIncidentId && (
                <Button size="sm" variant="ghost" onClick={resetIncidentForm}>
                  Cancelar edición
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button
            variant={confirmDelete ? 'destructive' : 'ghost'}
            onClick={() => (confirmDelete ? onDelete(assignment.id) : setConfirmDelete(true))}
          >
            {confirmDelete ? '¿Quitar del día?' : 'Quitar asignación'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
