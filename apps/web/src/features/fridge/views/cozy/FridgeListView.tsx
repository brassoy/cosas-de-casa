/**
 * FridgeListView — vista presentacional del theme `cozy` (Cuaderno manuscrito).
 *
 * MISMA funcionalidad y contrato que la vista base (`FridgeListViewProps`): solo
 * cambia la estética. Reproduce el look "diario de la casa" del kit estático
 * (`screens/themes/cozy.tsx` → `Fridge()`): página de papel pautado (`ck-page`),
 * tarjetas de papel (`ck-card`) agrupadas por ubicación con titular manuscrito
 * (`ck-marker`), tags a mano (`ck-tag`), botones pill (`ck-btn` / `ck-btn-blue` /
 * `ck-btn-red`), inputs con línea de puntos (`ck-input`) y sellos inclinados
 * (`ck-stamp`) para la urgencia.
 *
 * Las clases `.ck-*` viven en la hoja compartida `shared/theme/themes/cozy.css`;
 * las utilidades Tailwind semánticas (text-error, bg-success…) resuelven a los
 * colores del theme vía [data-theme='cozy']. Los matices cálidos decorativos del
 * kit (tinta marrón, boli azul, rojo/verde de feedback) se inyectan por `style`
 * con hex crudo igual que en el kit estático, porque son nuances sin var
 * semántica dedicada.
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

// Paleta cálida del cuaderno (kit `cozy.tsx`). Matices decorativos sin var
// semántica dedicada → hex crudo como el kit estático.
const C = {
  ink: '#3a2a1a',
  blue: '#2d4a8a',
  red: '#c0392b',
  green: '#5b8a3a',
  yellow: '#e3a51a',
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

/** Color de tinta del tag de caducidad según la urgencia precalculada. */
function urgencyTagStyle(urgency: FridgeListItem['urgency']): React.CSSProperties | undefined {
  switch (urgency) {
    case 'expired':
      return { background: C.red, color: '#fff', borderColor: C.red };
    case 'warning':
      return { background: C.yellow, color: C.ink, borderColor: C.yellow };
    case 'ok':
      return { background: C.green, color: '#fff', borderColor: C.green };
    case 'none':
      return undefined; // tag por defecto (.ck-tag): blanco con borde de tinta
  }
}

/** Color del borde izquierdo de la nota del ítem según la urgencia. */
function urgencyBorderColor(urgency: FridgeListItem['urgency']): string {
  switch (urgency) {
    case 'expired':
      return C.red;
    case 'warning':
      return C.yellow;
    case 'ok':
      return C.green;
    case 'none':
      return '#d9c79a'; // raya de papel
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
      ? `${urgentCount} ${urgentCount === 1 ? 'caduca' : 'caducan'} pronto`
      : `${items.length} ${items.length === 1 ? 'cosa' : 'cosas'} en casa`;

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="mx-auto max-w-[520px] space-y-4 px-5 pt-8 pb-24">
        {/* ── Cabecera "diario de la casa" (ck-marker manuscrita) ───────────── */}
        <header className="relative flex items-end justify-between gap-3 border-b border-dashed border-[#d9c79a] pb-4">
          <div className="min-w-0">
            <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
            <h2 className="ck-marker text-5xl leading-none" style={{ color: C.blue }}>
              <span aria-hidden="true">🧊 </span>Nevera
            </h2>
            <p className="mt-1 text-base opacity-80">{headerSub}</p>
          </div>
          <button
            type="button"
            onClick={onOpenAdd}
            aria-label="Añadir producto"
            className="ck-btn ck-btn-blue inline-flex shrink-0 items-center gap-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Añadir
          </button>
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
                  'ck-tag min-h-[34px] cursor-pointer transition',
                  !active && 'opacity-70 hover:opacity-100',
                )}
                style={active ? { background: C.blue, color: '#fff', borderColor: C.blue } : undefined}
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
              className="ck-card space-y-3 p-4"
              style={{ borderColor: C.red }}
            >
              <span className="ck-pin" aria-hidden="true" />
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="ck-marker flex items-center gap-1.5 text-2xl"
                  style={{ color: C.red }}
                >
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  Consumir primero
                </h3>
                <span className="ck-stamp">¡urgente!</span>
              </div>
              <ul className="m-0 list-none space-y-2 p-0">
                {urgent.map((item) => (
                  <FridgeRow key={item.id} item={item} {...rowHandlers} />
                ))}
              </ul>
            </section>
          )}

          {/* ── Ningún producto en la ubicación filtrada ── */}
          {visible.length === 0 && locationFilter !== 'ALL' && (
            <p className="text-base opacity-70">Ningún producto en esta ubicación.</p>
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
                  className="ck-card p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <p className="ck-marker text-2xl" style={{ color: C.blue }}>
                      {locationIcon(loc)} {FRIDGE_LOCATION_LABELS[loc]}
                    </p>
                    <span className="text-sm opacity-60">
                      ({inLoc.length})
                    </span>
                  </div>
                  <ul className="m-0 list-none space-y-2 p-0">
                    {inLoc.map((item) => (
                      <FridgeRow key={item.id} item={item} {...rowHandlers} />
                    ))}
                  </ul>
                </section>
              );
            })
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
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
        className="space-y-2 rounded-md border-b border-dashed py-2"
        style={{
          borderBottomColor: 'rgba(217, 199, 154, 0.6)',
          borderLeft: `4px solid ${urgencyBorderColor(item.urgency)}`,
          paddingLeft: 10,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg">{item.name}</p>
            {hasQty && qtyText && <p className="text-sm opacity-60">{qtyText}</p>}
          </div>
          {item.urgencyLabel && (
            <span
              className="ck-tag shrink-0 whitespace-nowrap"
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
            style={{ background: C.green, color: '#fff', borderColor: C.green }}
          >
            🍽️ Comer
          </ActionButton>
          <ActionButton
            onClick={() => onThrow(item.id)}
            aria-label={`Tirar ${item.name}`}
            title="Tirar"
            style={{ background: C.red, color: '#fff', borderColor: C.red }}
          >
            🗑️ Tirar
          </ActionButton>
          {item.location !== 'FREEZER' && (
            <ActionButton
              onClick={() => onFreeze(item.id)}
              aria-label={`Congelar ${item.name}`}
              title="Congelar"
              style={{ background: C.blue, color: '#fff', borderColor: C.blue }}
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
            className="ck-tag min-h-[34px] cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label={`Eliminar ${item.name}`}
            title="Eliminar"
            className="ck-tag ml-auto min-h-[34px] cursor-pointer"
            style={{ color: C.red }}
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
    <button type="button" {...rest} className="ck-tag min-h-[34px] cursor-pointer">
      {children}
    </button>
  );
}

// ── Diálogo de añadir / editar ──────────────────────────────────────────────
//
// Sub-flujo lógico (estado de formulario local + mapeo de payloads del
// contrato + siembra por `key`). Se REUTILIZA el shell shadcn `Dialog` (mantiene
// focus-trap / escape / portal / a11y) y solo se reestiliza su CONTENIDO con
// clases `.ck-*`. La lógica de la vista base se preserva verbatim (la base no
// exporta este sub-componente, por eso se copia su lógica sin cambios).

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
      <DialogContent aria-label={title} className="ck ck-card">
        <DialogHeader>
          <DialogTitle className="ck-marker text-4xl" style={{ color: C.blue }}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={`fridge-name-${mode}`} className="ck-marker text-xl" style={{ color: C.blue }}>
              Nombre{' '}
              <span aria-hidden="true" className="text-error">
                *
              </span>
            </label>
            <input
              id={`fridge-name-${mode}`}
              className="ck-input"
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
                className="ck-marker text-xl"
                style={{ color: C.blue }}
              >
                Cantidad
              </label>
              <input
                id={`fridge-quantity-${mode}`}
                className="ck-input"
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
                className="ck-marker text-xl"
                style={{ color: C.blue }}
              >
                Unidad
              </label>
              <input
                id={`fridge-unit-${mode}`}
                className="ck-input"
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
              className="ck-marker text-xl"
              style={{ color: C.blue }}
            >
              Ubicación
            </label>
            <Select value={location} onValueChange={(v) => setLocation(v as FridgeLocation)}>
              <SelectTrigger id={`fridge-location-${mode}`} aria-label="Ubicación" className="ck-input">
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
              className="ck-marker text-xl"
              style={{ color: C.blue }}
            >
              Fecha de caducidad
            </label>
            <input
              id={`fridge-expiry-${mode}`}
              className="ck-input"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              aria-label="Fecha de caducidad"
            />
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-md p-3 text-base"
              style={{ border: `2px solid ${C.red}`, color: C.red }}
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <button type="button" className="ck-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="ck-btn ck-btn-blue disabled:opacity-50"
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
