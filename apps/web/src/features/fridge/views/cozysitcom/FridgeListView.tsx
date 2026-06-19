/**
 * FridgeListView — vista presentacional del theme `cozysitcom` (Sitcom Cozy 70s).
 *
 * MISMA funcionalidad y contrato que la vista base (`FridgeListViewProps`): solo
 * cambia la estética. Reproduce el look retro cálido del kit estático
 * (`screens/themes/cozysitcom.tsx` → `Fridge()`): cabecera serif + cinta
 * mostaza, tarjetas `cz-frame` agrupadas por ubicación, tags `cz-tag` con color
 * por ubicación/urgencia, sello `cz-stamp` para "Consumir primero", inputs
 * `cz-input` y botones `cz-btn-*` en el diálogo de añadir/editar.
 *
 * Las clases `.cz-*` viven en la hoja compartida
 * `shared/theme/themes/cozysitcom.css`; las utilidades Tailwind semánticas
 * (bg-success, text-error, border-warning…) resuelven a los colores del theme
 * vía [data-theme='cozysitcom'].
 *
 * Presentacional PURO: solo props in / callbacks out. Sin fetch, hooks de
 * datos, stores ni navegación. La urgencia de caducidad llega PRECALCULADA en
 * `item.urgency` desde el container (single source of truth: `getExpiryUrgency`).
 *
 * Detalles de accesibilidad/contrato preservados de la vista base (el container
 * y la suite los esperan):
 *  - Título de nivel 2 "Nevera", botón accesible "Añadir producto".
 *  - Sección "Consumir primero" como `region` aria-label, solo con filter=ALL.
 *  - `data-urgency` por ítem (expired | warning | ok | none).
 *  - aria-labels de acciones: "Marcar X como consumido", "Tirar X", "Congelar X",
 *    "Editar X", "Eliminar X".
 *  - Mensaje vacío "La despensa está vacía" y diálogo "Añadir producto".
 */

import { useState } from 'react';
import { Plus, Trash2, Pencil, Utensils, Snowflake, AlertTriangle } from 'lucide-react';
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

/** Fondo del tag de ubicación (color cálido del kit por ubicación). */
function locationTagClasses(loc: FridgeLocation): string {
  switch (loc) {
    case 'FRIDGE':
      return 'bg-accent text-text-inverse'; // denim
    case 'FREEZER':
      return 'bg-error text-text-inverse'; // granate
    case 'PANTRY':
      return 'bg-warning text-text'; // mostaza
  }
}

/** Clases del tag de caducidad según la urgencia precalculada. */
function urgencyTagClasses(urgency: FridgeListItem['urgency']): string {
  switch (urgency) {
    case 'expired':
      return 'bg-error text-text-inverse';
    case 'warning':
      return 'bg-warning text-text';
    case 'ok':
      return 'bg-success text-text-inverse';
    case 'none':
      return ''; // tag por defecto (.cz-tag): beige
  }
}

/** Color del borde izquierdo de la tarjeta según la urgencia. */
function urgencyBorderClasses(urgency: FridgeListItem['urgency']): string {
  switch (urgency) {
    case 'expired':
      return 'border-l-error';
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
    <div className="cz space-y-4 px-5 pb-10">
      {/* ── Cabecera serif + cinta mostaza ─────────────────────────────── */}
      <header className="cz-pop">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <h2 className="cz-serif text-4xl leading-none">
            <span aria-hidden="true">🧊 </span>Nevera
          </h2>
          <button
            type="button"
            onClick={onOpenAdd}
            aria-label="Añadir producto"
            className="cz-btn-denim inline-flex items-center gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Añadir
          </button>
        </div>
        <div className="cz-stripe mt-3" />
      </header>

      {/* ── Filtro por ubicación (tags conmutables) ────────────────────── */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por ubicación">
        {(['ALL', ...LOCATION_ORDER] as FridgeLocationFilter[]).map((f) => {
          const active = locationFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChangeFilter(f)}
              aria-pressed={active}
              className={cn(
                'cz-tag min-h-[34px] cursor-pointer transition',
                active ? 'bg-accent text-text-inverse' : 'opacity-80 hover:opacity-100',
              )}
            >
              {f === 'ALL' ? 'Todo' : `${locationIcon(f)} ${FRIDGE_LOCATION_LABELS[f]}`}
            </button>
          );
        })}
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
            className="cz-frame cz-pop space-y-3 border-l-4 border-error"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="cz-serif flex items-center gap-1.5 text-lg text-error">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Consumir primero
              </h3>
              <span className="cz-stamp">URGENTE</span>
            </div>
            <ul className="space-y-2 list-none p-0 m-0">
              {urgent.map((item) => (
                <FridgeRow key={item.id} item={item} {...rowHandlers} />
              ))}
            </ul>
          </section>
        )}

        {/* ── Ningún producto en la ubicación filtrada ── */}
        {visible.length === 0 && locationFilter !== 'ALL' && (
          <p className="text-sm opacity-70">Ningún producto en esta ubicación.</p>
        )}

        {/* ── Listado: agrupado por ubicación con filter=ALL, plano si no ── */}
        {locationFilter === 'ALL' ? (
          LOCATION_ORDER.map((loc) => {
            const inLoc = visible.filter((i) => i.location === loc);
            if (inLoc.length === 0) return null;
            return (
              <section key={loc} aria-label={FRIDGE_LOCATION_LABELS[loc]} className="cz-frame cz-pop">
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('cz-tag', locationTagClasses(loc))}>
                    {locationIcon(loc)} {FRIDGE_LOCATION_LABELS[loc]}
                  </span>
                  <span className="text-xs opacity-60">{inLoc.length} items</span>
                </div>
                <ul className="space-y-2 list-none p-0 m-0">
                  {inLoc.map((item) => (
                    <FridgeRow key={item.id} item={item} {...rowHandlers} />
                  ))}
                </ul>
              </section>
            );
          })
        ) : (
          <ul className="space-y-2 list-none p-0 m-0">
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
      <div
        data-urgency={item.urgency}
        className={cn(
          'space-y-2 rounded-md border border-border bg-surface-raised border-l-4 p-3',
          urgencyBorderClasses(item.urgency),
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="cz-serif truncate">{item.name}</p>
            {hasQty && qtyText && <p className="text-xs opacity-60">{qtyText}</p>}
          </div>
          {item.urgencyLabel && (
            <span className={cn('cz-tag shrink-0 whitespace-nowrap', urgencyTagClasses(item.urgency))}>
              {item.urgencyLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
            className="cz-btn-ghost min-h-[34px] !px-2.5 !py-1.5 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label={`Eliminar ${item.name}`}
            title="Eliminar"
            className="cz-btn-ghost ml-auto min-h-[34px] !px-2.5 !py-1.5 text-xs text-error"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

function ActionButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className="cz-btn-ghost min-h-[34px] !px-2.5 !py-1.5 text-xs">
      {children}
    </button>
  );
}

// ── Diálogo de añadir / editar ──────────────────────────────────────────────
//
// Sub-flujo lógico (estado de formulario local + mapeo de payloads del
// contrato + siembra por `key`). Se reimplementa restyled con `cz-input` /
// `cz-btn-*` PRESERVANDO la lógica de la vista base sin cambios (la base no
// exporta este sub-componente, por eso se copia su lógica verbatim).

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
      <DialogContent aria-label={title} className="cz">
        <DialogHeader>
          <DialogTitle className="cz-serif text-2xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={`fridge-name-${mode}`} className="text-xs font-bold uppercase opacity-70">
              Nombre{' '}
              <span aria-hidden="true" className="text-error">
                *
              </span>
            </label>
            <input
              id={`fridge-name-${mode}`}
              className="cz-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label
                htmlFor={`fridge-quantity-${mode}`}
                className="text-xs font-bold uppercase opacity-70"
              >
                Cantidad
              </label>
              <input
                id={`fridge-quantity-${mode}`}
                className="cz-input"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-label="Cantidad"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`fridge-unit-${mode}`}
                className="text-xs font-bold uppercase opacity-70"
              >
                Unidad
              </label>
              <input
                id={`fridge-unit-${mode}`}
                className="cz-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, l, ud."
                maxLength={50}
                aria-label="Unidad"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`fridge-location-${mode}`}
              className="text-xs font-bold uppercase opacity-70"
            >
              Ubicación
            </label>
            <Select value={location} onValueChange={(v) => setLocation(v as FridgeLocation)}>
              <SelectTrigger id={`fridge-location-${mode}`} aria-label="Ubicación" className="cz-input">
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
            <label
              htmlFor={`fridge-expiry-${mode}`}
              className="text-xs font-bold uppercase opacity-70"
            >
              Fecha de caducidad
            </label>
            <input
              id={`fridge-expiry-${mode}`}
              className="cz-input"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              aria-label="Fecha de caducidad"
            />
          </div>

          {submitError && (
            <p
              role="alert"
              className="cz-frame border-l-4 border-error p-3 text-sm font-bold text-error"
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <button type="button" className="cz-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="cz-btn-denim disabled:opacity-50"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting
              ? mode === 'add'
                ? 'Añadiendo…'
                : 'Guardando…'
              : mode === 'add'
                ? 'Añadir'
                : 'Guardar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
