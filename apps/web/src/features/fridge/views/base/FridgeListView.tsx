/**
 * FridgeListView — vista presentacional `base` (estética shadcn) de la nevera.
 *
 * Porta el JSX del componente base del kit (Lovable `fridge.tsx`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con los DTOs
 * reales y preservando el contrato de accesibilidad (roles, aria-labels) que el
 * container y los tests esperan.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. La urgencia de caducidad llega PRECALCULADA en `item.urgency`
 * desde el container (single source of truth: `getExpiryUrgency`).
 *
 * Detalles preservados del container actual para no romper la suite:
 *  - Título de nivel 2 "Nevera", botón accesible "Añadir producto".
 *  - Sección "Consumir primero" como `region` aria-label, solo con filter=ALL.
 *  - `data-urgency` por ítem (expired | warning | ok | none).
 *  - aria-labels de acciones: "Marcar X como consumido", "Tirar X", "Congelar X",
 *    "Editar X", "Eliminar X".
 *  - Mensaje vacío "La despensa está vacía" y diálogo "Añadir producto".
 */

import { useState } from 'react';
import { Plus, Trash2, Pencil, Utensils, Snowflake, AlertTriangle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { FRIDGE_LOCATION_LABELS } from '../../types';
import type {
  FridgeListItem,
  FridgeListViewProps,
  FridgeLocation,
  FridgeLocationFilter,
} from '../types';

// ── Constantes de presentación ────────────────────────────────────────────────

const LOCATION_ORDER: FridgeLocation[] = ['FRIDGE', 'FREEZER', 'PANTRY'];

function locationIcon(loc: FridgeLocation): string {
  switch (loc) {
    case 'FRIDGE':
      return '❄️';
    case 'FREEZER':
      return '🧊';
    case 'PANTRY':
      return '🥫';
  }
}

/** Clases del badge de caducidad según la urgencia precalculada. */
function urgencyBadgeClasses(urgency: FridgeListItem['urgency']): string {
  switch (urgency) {
    case 'expired':
      return 'bg-destructive/15 text-destructive';
    case 'warning':
      return 'bg-warning/15 text-warning';
    case 'ok':
      return 'bg-success/15 text-success';
    case 'none':
      return 'bg-muted text-muted-foreground';
  }
}

/** Color del borde izquierdo de la tarjeta según la urgencia. */
function urgencyBorderClasses(urgency: FridgeListItem['urgency']): string {
  switch (urgency) {
    case 'expired':
      return 'border-l-destructive';
    case 'warning':
      return 'border-l-warning';
    case 'ok':
      return 'border-l-success';
    case 'none':
      return 'border-l-border';
  }
}

// ── Vista principal ─────────────────────────────────────────────────────────

export default function FridgeListView(props: FridgeListViewProps) {
  const {
    items,
    isLoading,
    error,
    locationFilter,
    isAddOpen,
    editingItem,
    isSubmitting,
    submitError,
    onChangeFilter,
    onOpenAdd,
    onOpenEdit,
    onCloseDialogs,
    onAdd,
    onUpdate,
    onDelete,
    onEat,
    onThrow,
    onFreeze,
  } = props;

  const visible =
    locationFilter === 'ALL' ? items : items.filter((i) => i.location === locationFilter);

  // Sección "Consumir primero": solo con filter=ALL (urgencia ya precalculada).
  const urgent =
    locationFilter === 'ALL'
      ? items.filter((i) => i.urgency === 'expired' || i.urgency === 'warning')
      : [];

  const rowHandlers = { onOpenEdit, onDelete, onEat, onThrow, onFreeze };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="text-2xl font-bold">
          <span aria-hidden="true">🧊 </span>Nevera
        </h2>
        <Button size="sm" onClick={onOpenAdd} aria-label="Añadir producto">
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Añadir
        </Button>
      </header>

      {/* ── Filtro por ubicación ── */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por ubicación">
        {(['ALL', ...LOCATION_ORDER] as FridgeLocationFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChangeFilter(f)}
            aria-pressed={locationFilter === f}
            className={cn(
              'min-h-[36px] shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
              locationFilter === f
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-card',
            )}
          >
            {f === 'ALL' ? 'Todo' : `${locationIcon(f)} ${FRIDGE_LOCATION_LABELS[f]}`}
          </button>
        ))}
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyIcon={<Utensils className="h-10 w-10" aria-hidden="true" />}
        emptyTitle="La despensa está vacía. ¡Añade tu primer producto!"
        emptyCta={{ label: 'Añadir primer producto', onClick: onOpenAdd }}
      >
        {/* ── Consumir primero (solo filter=ALL) ── */}
        {urgent.length > 0 && (
          <section
            aria-label="Consumir primero"
            className="space-y-2 rounded-card border border-destructive bg-destructive/5 p-4"
          >
            <h3 className="flex items-center gap-1 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Consumir primero
            </h3>
            <ul className="space-y-2">
              {urgent.map((item) => (
                <FridgeRow key={item.id} item={item} {...rowHandlers} />
              ))}
            </ul>
          </section>
        )}

        {/* ── Ningún producto en la ubicación filtrada ── */}
        {visible.length === 0 && locationFilter !== 'ALL' && (
          <p className="text-sm text-muted-foreground">Ningún producto en esta ubicación.</p>
        )}

        {/* ── Listado: agrupado por ubicación con filter=ALL, plano si no ── */}
        {locationFilter === 'ALL' ? (
          LOCATION_ORDER.map((loc) => {
            const inLoc = visible.filter((i) => i.location === loc);
            if (inLoc.length === 0) return null;
            return (
              <section
                key={loc}
                aria-label={FRIDGE_LOCATION_LABELS[loc]}
                className="space-y-2"
              >
                <h3 className="text-lg font-semibold">
                  {locationIcon(loc)} {FRIDGE_LOCATION_LABELS[loc]}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({inLoc.length})
                  </span>
                </h3>
                <ul className="space-y-2">
                  {inLoc.map((item) => (
                    <FridgeRow key={item.id} item={item} {...rowHandlers} />
                  ))}
                </ul>
              </section>
            );
          })
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <FridgeRow key={item.id} item={item} {...rowHandlers} />
            ))}
          </ul>
        )}
      </ScreenState>

      {/* ── Diálogo Añadir ── */}
      {/* `key` fuerza el remontado al abrir → el formulario arranca limpio sin
          necesitar efectos de sincronización. */}
      <FridgeItemDialog
        key={isAddOpen ? 'add-open' : 'add-closed'}
        mode="add"
        open={Boolean(isAddOpen)}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={onCloseDialogs}
        onAdd={onAdd}
        onUpdate={onUpdate}
      />

      {/* ── Diálogo Editar ── */}
      {/* `key` por id del ítem → el formulario se siembra con sus valores al abrir. */}
      <FridgeItemDialog
        key={editingItem ? `edit-${editingItem.id}` : 'edit-closed'}
        mode="edit"
        open={Boolean(editingItem)}
        item={editingItem ?? undefined}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={onCloseDialogs}
        onAdd={onAdd}
        onUpdate={onUpdate}
      />
    </div>
  );
}

// ── Fila de ítem ────────────────────────────────────────────────────────────

interface FridgeRowProps {
  item: FridgeListItem;
  onOpenEdit: (item: FridgeListItem) => void;
  onDelete: (id: string) => void;
  onEat: (id: string) => void;
  onThrow: (id: string) => void;
  onFreeze: (id: string) => void;
}

function FridgeRow({ item, onOpenEdit, onDelete, onEat, onThrow, onFreeze }: FridgeRowProps) {
  const hasQty = item.quantity != null || item.unit != null;
  const qtyText = `${item.quantity != null ? Number(item.quantity) : ''}${
    item.unit ? ` ${item.unit}` : ''
  }`.trim();

  return (
    <li>
      <Card
        data-urgency={item.urgency}
        className={cn('space-y-2 border-l-4 p-3', urgencyBorderClasses(item.urgency))}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.name}</p>
            {hasQty && qtyText && <p className="text-xs text-muted-foreground">{qtyText}</p>}
          </div>
          {item.urgencyLabel && (
            <span
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
                urgencyBadgeClasses(item.urgency),
              )}
            >
              {item.urgencyLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <ActionButton
            onClick={() => onEat(item.id)}
            aria-label={`Marcar ${item.name} como consumido`}
            title="Comer"
          >
            🍽️ Comer
          </ActionButton>
          <ActionButton
            onClick={() => onThrow(item.id)}
            aria-label={`Tirar ${item.name}`}
            title="Tirar"
          >
            🗑️ Tirar
          </ActionButton>
          {item.location !== 'FREEZER' && (
            <ActionButton
              onClick={() => onFreeze(item.id)}
              aria-label={`Congelar ${item.name}`}
              title="Congelar"
            >
              <Snowflake className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Congelar
            </ActionButton>
          )}
          <button
            type="button"
            onClick={() => onOpenEdit(item)}
            aria-label={`Editar ${item.name}`}
            title="Editar"
            className="min-h-[36px] rounded-md px-2.5 py-1.5 text-xs hover:bg-card"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label={`Eliminar ${item.name}`}
            title="Eliminar"
            className="ml-auto min-h-[36px] rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-card"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </Card>
    </li>
  );
}

function ActionButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="min-h-[36px] rounded-md border border-border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

// ── Diálogo de añadir / editar ──────────────────────────────────────────────

interface FridgeItemDialogProps {
  mode: 'add' | 'edit';
  open: boolean;
  item?: FridgeListItem;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onAdd: FridgeListViewProps['onAdd'];
  onUpdate: FridgeListViewProps['onUpdate'];
}

function FridgeItemDialog({
  mode,
  open,
  item,
  isSubmitting,
  submitError,
  onClose,
  onAdd,
  onUpdate,
}: FridgeItemDialogProps) {
  // Estado de formulario LOCAL (UI pura, no datos): se siembra con `key` desde
  // el padre al abrir, por eso no usamos efectos para sincronizar.
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? String(Number(item.quantity)) : '',
  );
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [location, setLocation] = useState<FridgeLocation>(item?.location ?? 'FRIDGE');
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ?? '');

  const title = mode === 'add' ? 'Añadir producto' : 'Editar producto';
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (mode === 'add') {
      onAdd({
        name: trimmedName,
        quantity: quantity ? String(Number(quantity)) : undefined,
        unit: unit.trim() || undefined,
        location,
        expiryDate: expiryDate || undefined,
      });
    } else if (item) {
      onUpdate(item.id, {
        name: trimmedName,
        quantity: quantity ? String(Number(quantity)) : null,
        unit: unit.trim() || null,
        location,
        expiryDate: expiryDate || null,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent aria-label={title}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`fridge-name-${mode}`}>
              Nombre{' '}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Input
              id={`fridge-name-${mode}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`fridge-quantity-${mode}`}>Cantidad</Label>
              <Input
                id={`fridge-quantity-${mode}`}
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-label="Cantidad"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`fridge-unit-${mode}`}>Unidad</Label>
              <Input
                id={`fridge-unit-${mode}`}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, l, ud."
                maxLength={50}
                aria-label="Unidad"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`fridge-location-${mode}`}>Ubicación</Label>
            <Select
              value={location}
              onValueChange={(v) => setLocation(v as FridgeLocation)}
            >
              <SelectTrigger id={`fridge-location-${mode}`} aria-label="Ubicación">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_ORDER.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {locationIcon(loc)} {FRIDGE_LOCATION_LABELS[loc]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`fridge-expiry-${mode}`}>Fecha de caducidad</Label>
            <Input
              id={`fridge-expiry-${mode}`}
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              aria-label="Fecha de caducidad"
            />
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting
              ? mode === 'add'
                ? 'Añadiendo…'
                : 'Guardando…'
              : mode === 'add'
                ? 'Añadir'
                : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
