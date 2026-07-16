/**
 * RoutineItemsView — vista presentacional `base` del catálogo de items.
 *
 * CRUD del catálogo familiar: nombre (con emoji), regla (veces/semana +
 * ventana horaria por defecto, puede cruzar medianoche) y tags para agrupar en
 * estadísticas. Borrar un item en uso lo ARCHIVA (la API protege el histórico).
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
import { computeDurationMinutes, formatMinutes } from '../../types';
import type { RoutineItemDto } from '../../types';
import type { RoutineItemFormValues, RoutineItemsViewProps } from '../types';

export default function RoutineItemsView(props: RoutineItemsViewProps) {
  const {
    items, isLoading, error, showArchived,
    editingItem, isEditorOpen, isSubmitting, submitError,
    onToggleShowArchived, onOpenCreate, onOpenEdit, onCloseEditor, onSubmit,
    onToggleArchived, onDelete, onBack,
  } = props;

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground">
          ‹ Rutinas
        </button>
        <h1 className="text-2xl font-bold">Items de rutina</h1>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={onToggleShowArchived} />
          Mostrar archivados
        </label>
        <Button size="sm" onClick={onOpenCreate}>+ Nuevo item</Button>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyIcon={<span className="text-3xl">🧩</span>}
        emptyTitle="Crea items reutilizables: «Trabajo ☀️ Pablo», «TL Laura»…"
        emptyCta={{ label: 'Nuevo item', onClick: onOpenCreate }}
      >
        <ul className="m-0 list-none space-y-2 p-0">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {item.name}
                    {item.archivedAt && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        archivado
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.targetTimesPerWeek}×/semana · {item.defaultStartTime}–
                    {item.defaultEndTime}
                    {item.defaultEndTime <= item.defaultStartTime && ' (+1d)'}
                    {' · '}
                    {formatMinutes(
                      computeDurationMinutes(item.defaultStartTime, item.defaultEndTime),
                    )}
                  </p>
                  {item.tags.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onOpenEdit(item)}>✏️</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={item.archivedAt ? 'Restaurar' : 'Archivar'}
                    onClick={() => onToggleArchived(item)}
                  >
                    {item.archivedAt ? '♻️' : '📦'}
                  </Button>
                  <Button
                    variant={confirmDeleteId === item.id ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      if (confirmDeleteId === item.id) {
                        onDelete(item);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(item.id);
                      }
                    }}
                  >
                    {confirmDeleteId === item.id ? '¿Borrar?' : '🗑️'}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </ScreenState>

      <ItemEditorDialog
        // Remonta el formulario al abrir/cambiar de item: el estado inicial
        // sale de props sin efectos (regla react-hooks/set-state-in-effect).
        key={`${editingItem?.id ?? 'new'}:${isEditorOpen}`}
        open={isEditorOpen}
        editingItem={editingItem}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={onCloseEditor}
        onSubmit={onSubmit}
      />
    </div>
  );
}

// ── Editor (crear / editar) ───────────────────────────────────────────────────

function ItemEditorDialog({
  open, editingItem, isSubmitting, submitError, onClose, onSubmit,
}: {
  open: boolean;
  editingItem: RoutineItemDto | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (values: RoutineItemFormValues) => void;
}) {
  // El componente se remonta (key en el padre) al abrir o cambiar de item:
  // los initializers leen de props sin necesidad de efectos.
  const [name, setName] = useState(editingItem?.name ?? '');
  const [target, setTarget] = useState(editingItem?.targetTimesPerWeek ?? 1);
  const [startTime, setStartTime] = useState(editingItem?.defaultStartTime ?? '09:00');
  const [endTime, setEndTime] = useState(editingItem?.defaultEndTime ?? '14:00');
  const [tagsText, setTagsText] = useState(editingItem?.tags.join(', ') ?? '');

  const crossesMidnight = endTime <= startTime && startTime !== endTime;

  function handleSubmit() {
    onSubmit({
      name: name.trim(),
      targetTimesPerWeek: target,
      defaultStartTime: startTime,
      defaultEndTime: endTime,
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar item' : 'Nuevo item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Nombre</Label>
            <Input
              id="item-name"
              value={name}
              placeholder="Trabajo ☀️ Pablo"
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-target">Veces/semana</Label>
              <Input
                id="item-target"
                type="number"
                min={1}
                max={7}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-start">Desde</Label>
              <Input
                id="item-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-end">Hasta</Label>
              <Input
                id="item-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {crossesMidnight && (
            <p className="text-xs text-muted-foreground">
              🌙 La ventana cruza medianoche: termina al día siguiente (
              {formatMinutes(computeDurationMinutes(startTime, endTime))}).
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="item-tags">Tags (separados por comas)</Label>
            <Input
              id="item-tags"
              value={tagsText}
              placeholder="pablo, trabajo"
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>

          {submitError && <p className="text-sm text-error">{submitError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || startTime === endTime}
          >
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
