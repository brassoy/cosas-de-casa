/**
 * FridgeListView — vista presentacional del theme `springfield` (Cómic pop).
 *
 * MISMA funcionalidad y contrato que la vista base (`FridgeListViewProps`): solo
 * cambia la estética. Reproduce el look cómic del kit estático
 * (`screens/themes/springfield.tsx` → `Fridge()`): cabecera amarilla
 * (`sf-card-y`) con titular Bangers, tarjetas `sf-card` agrupadas por ubicación,
 * `sf-tag` con color plano por ubicación/urgencia, `sf-sticker` para "Consumir
 * primero", inputs `sf-input` y botones `sf-btn-*` en el diálogo de añadir/editar.
 *
 * Las clases `.sf-*` viven en la hoja compartida
 * `shared/theme/themes/springfield.css`; las utilidades Tailwind semánticas
 * (bg-success, text-error, border-error…) resuelven a los colores del theme vía
 * [data-theme='springfield']. Los matices planos del cómic (rosa/celeste/amarillo
 * de los `sf-tag`) se inyectan por `style` igual que en el kit estático.
 *
 * Presentacional PURO: solo props in / callbacks out. Sin fetch, hooks de datos,
 * stores ni navegación. La urgencia de caducidad llega PRECALCULADA en
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

// Paleta plana del cómic (kit `springfield.tsx`). Sin var semántica para los
// matices puramente decorativos del tag por ubicación → hex crudo como el kit.
const INK = '#1A1A1A';
const COMIC = {
  yellow: '#FFD90F',
  sky: '#70C5FF',
  red: '#E53935',
  green: '#7CB342',
  pink: '#F48FB1',
  white: '#FFFFFF',
} as const;

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

/** Color de fondo del tag por ubicación (kit: FRIDGE sky, FREEZER pink, PANTRY yellow). */
function locationTagStyle(loc: FridgeLocation): React.CSSProperties {
  switch (loc) {
    case 'FRIDGE':
      return { background: COMIC.sky, color: INK };
    case 'FREEZER':
      return { background: COMIC.pink, color: INK };
    case 'PANTRY':
      return { background: COMIC.yellow, color: INK };
  }
}

/** Color del tag de caducidad según la urgencia precalculada. */
function urgencyTagStyle(urgency: FridgeListItem['urgency']): React.CSSProperties | undefined {
  switch (urgency) {
    case 'expired':
      return { background: COMIC.red, color: COMIC.white };
    case 'warning':
      return { background: COMIC.yellow, color: INK };
    case 'ok':
      return { background: COMIC.green, color: COMIC.white };
    case 'none':
      return undefined; // tag por defecto (.sf-tag): blanco
  }
}

/** Color del borde izquierdo de la viñeta del ítem según la urgencia. */
function urgencyBorderColor(urgency: FridgeListItem['urgency']): string {
  switch (urgency) {
    case 'expired':
      return COMIC.red;
    case 'warning':
      return COMIC.yellow;
    case 'ok':
      return COMIC.green;
    case 'none':
      return INK;
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

  // Subtítulo real (NO el "2 caducan pronto" hardcodeado del kit): se deriva de
  // los datos que llegan por props.
  const urgentCount = items.filter(
    (i) => i.urgency === 'expired' || i.urgency === 'warning',
  ).length;
  const headerSub =
    urgentCount > 0
      ? `${urgentCount} ${urgentCount === 1 ? 'caduca' : 'caducan'} pronto ⚠️`
      : `${items.length} ${items.length === 1 ? 'producto' : 'productos'} en casa`;

  return (
    <div className="sf sf-dot min-h-[80dvh] px-5 pt-8 pb-10">
      <div className="max-w-[520px] mx-auto space-y-4">
      {/* ── Cabecera amarilla de cómic (sf-card-y + Bangers) ───────────────── */}
      <header className="sf-card-y sf-pop relative p-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="sf-bangers text-4xl leading-none">
              <span aria-hidden="true">🧊 </span>Nevera
            </h2>
            <p className="sf-fredoka text-sm mt-1">{headerSub}</p>
          </div>
          <button
            type="button"
            onClick={onOpenAdd}
            aria-label="Añadir producto"
            className="sf-btn inline-flex items-center gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Añadir
          </button>
        </div>
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
              className={cn('sf-tag min-h-[34px] cursor-pointer transition', !active && 'opacity-70 hover:opacity-100')}
              style={active ? { background: INK, color: COMIC.white } : undefined}
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
            className="sf-card-p sf-pop space-y-3 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="sf-bangers flex items-center gap-1.5 text-2xl">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Consumir primero
              </h3>
              <span className="sf-sticker" style={{ background: COMIC.red, color: COMIC.white }}>
                ¡URGENTE!
              </span>
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
          <p className="sf-fredoka text-sm opacity-70">Ningún producto en esta ubicación.</p>
        )}

        {/* ── Listado: agrupado por ubicación con filter=ALL, plano si no ── */}
        {locationFilter === 'ALL' ? (
          LOCATION_ORDER.map((loc) => {
            const inLoc = visible.filter((i) => i.location === loc);
            if (inLoc.length === 0) return null;
            return (
              <section key={loc} aria-label={FRIDGE_LOCATION_LABELS[loc]} className="sf-card sf-pop p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="sf-tag" style={locationTagStyle(loc)}>
                    {locationIcon(loc)} {FRIDGE_LOCATION_LABELS[loc]}
                  </span>
                  <span className="text-xs opacity-60">
                    {inLoc.length} {inLoc.length === 1 ? 'item' : 'items'}
                  </span>
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
        className="space-y-2 rounded-xl border-2 p-3"
        style={{ borderColor: INK + '1A', borderLeftColor: urgencyBorderColor(item.urgency), borderLeftWidth: 5 }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="sf-fredoka truncate">{item.name}</p>
            {hasQty && qtyText && <p className="text-xs opacity-60">{qtyText}</p>}
          </div>
          {item.urgencyLabel && (
            <span
              className="sf-tag shrink-0 whitespace-nowrap"
              style={urgencyTagStyle(item.urgency)}
            >
              {item.urgencyLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ActionButton
            onClick={() => onEat(item.id)}
            aria-label={`Marcar ${item.name} como consumido`}
            title="Comer"
            style={{ background: COMIC.green, color: COMIC.white }}
          >
            🍽️ Comer
          </ActionButton>
          <ActionButton
            onClick={() => onThrow(item.id)}
            aria-label={`Tirar ${item.name}`}
            title="Tirar"
            style={{ background: COMIC.red, color: COMIC.white }}
          >
            🗑️ Tirar
          </ActionButton>
          {item.location !== 'FREEZER' && (
            <ActionButton
              onClick={() => onFreeze(item.id)}
              aria-label={`Congelar ${item.name}`}
              title="Congelar"
              style={{ background: COMIC.sky, color: INK }}
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
            className="sf-tag min-h-[34px] cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label={`Eliminar ${item.name}`}
            title="Eliminar"
            className="sf-tag ml-auto min-h-[34px] cursor-pointer"
            style={{ color: COMIC.red }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

function ActionButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className="sf-tag min-h-[34px] cursor-pointer">
      {children}
    </button>
  );
}

// ── Diálogo de añadir / editar ──────────────────────────────────────────────
//
// Sub-flujo lógico (estado de formulario local + mapeo de payloads del
// contrato + siembra por `key`). Se reimplementa restyled con `sf-input` /
// `sf-btn-*` PRESERVANDO la lógica de la vista base sin cambios (la base no
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
      <DialogContent aria-label={title} className="sf">
        <DialogHeader>
          <DialogTitle className="sf-bangers text-3xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={`fridge-name-${mode}`} className="sf-fredoka text-xs uppercase opacity-70">
              Nombre{' '}
              <span aria-hidden="true" className="text-error">
                *
              </span>
            </label>
            <input
              id={`fridge-name-${mode}`}
              className="sf-input"
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
                className="sf-fredoka text-xs uppercase opacity-70"
              >
                Cantidad
              </label>
              <input
                id={`fridge-quantity-${mode}`}
                className="sf-input"
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
                className="sf-fredoka text-xs uppercase opacity-70"
              >
                Unidad
              </label>
              <input
                id={`fridge-unit-${mode}`}
                className="sf-input"
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
              className="sf-fredoka text-xs uppercase opacity-70"
            >
              Ubicación
            </label>
            <Select value={location} onValueChange={(v) => setLocation(v as FridgeLocation)}>
              <SelectTrigger id={`fridge-location-${mode}`} aria-label="Ubicación" className="sf-input">
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
              className="sf-fredoka text-xs uppercase opacity-70"
            >
              Fecha de caducidad
            </label>
            <input
              id={`fridge-expiry-${mode}`}
              className="sf-input"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              aria-label="Fecha de caducidad"
            />
          </div>

          {submitError && (
            <p
              role="alert"
              className="sf-card-p p-3 text-sm font-bold"
              style={{ color: INK }}
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <button type="button" className="sf-btn sf-btn-w" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="sf-btn sf-btn-g disabled:opacity-50"
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
