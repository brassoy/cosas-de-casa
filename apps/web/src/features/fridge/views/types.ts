/**
 * Contrato de props de las pantallas de la feature `fridge`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable `fridge.tsx`) reconciliado
 * con los DTOs reales de `@cosasdecasa/contracts`:
 *
 *  - El kit usaba un tipo local `FridgeItem`; aquí se usa `FridgeItemDto` real
 *    (`quantity`, `unit`, `expiryDate` son `string | null`, no opcionales).
 *  - El kit recalculaba la urgencia de caducidad dentro de la vista
 *    (`expiryInfo`). Aquí la urgencia se PRECALCULA en el container y se pasa por
 *    `item.urgency` (decisión recomendada del plan §4 fila 11 / §7 decisión A):
 *    la fuente de verdad de la urgencia es `getExpiryUrgency` del container, la
 *    vista solo pinta. Por eso el contrato expone `FridgeListItem`
 *    (`FridgeItemDto` + `urgency` + `urgencyLabel` precalculados).
 *  - El kit emitía `onAdd(input)` y `onEdit(item)` (señal de "abrir edición").
 *    Aquí el formulario de añadir/editar es presentacional dentro de la vista y
 *    emite payloads del contrato real: `onAdd(AddFridgeItemInput)` y
 *    `onUpdate(id, UpdateFridgeItemInput)`. Las mutaciones viven en el container.
 *  - Se añaden `isSubmitting` / `submitError` para reflejar el estado real de las
 *    mutaciones de añadir/editar (el kit no los tenía).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores.
 */

import type {
  FridgeItemDto,
  FridgeLocation,
  AddFridgeItemInput,
  UpdateFridgeItemInput,
} from '@cosasdecasa/contracts';
import type { ExpiryUrgency } from '../types';

export type { FridgeLocation } from '@cosasdecasa/contracts';

/** Filtro de ubicación activo (incluye el pseudovalor `ALL`). */
export type FridgeLocationFilter = FridgeLocation | 'ALL';

/**
 * Ítem listo para pintar: el DTO real + la urgencia y su etiqueta ya
 * precalculadas en el container (single source of truth: `getExpiryUrgency`).
 */
export interface FridgeListItem extends FridgeItemDto {
  /** Nivel de urgencia por caducidad, precalculado en el container. */
  urgency: ExpiryUrgency;
  /** Etiqueta legible de la urgencia (vacía si no hay fecha). */
  urgencyLabel: string;
}

export interface FridgeListViewProps {
  /** Inventario completo de la familia, ya ordenado por caducidad. */
  items: FridgeListItem[];
  /** Carga del inventario en curso. */
  isLoading?: boolean;
  /** Mensaje de error de carga; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Filtro de ubicación activo (estado en Zustand, lo provee el container). */
  locationFilter: FridgeLocationFilter;

  // ── Estado de los diálogos (controlado por el container) ──────────────────
  // El container es dueño de la visibilidad para poder cerrar los diálogos
  // SOLO cuando la mutación termina con éxito (y mantenerlos abiertos —mostrando
  // `submitError`— cuando falla). Así la vista sigue siendo pura.
  /** El diálogo de "Añadir" está abierto. */
  isAddOpen?: boolean;
  /** Ítem en edición, o `null` si el diálogo de edición está cerrado. */
  editingItem?: FridgeListItem | null;
  /** Una mutación de añadir o editar está en curso. */
  isSubmitting?: boolean;
  /** Error de la última mutación de añadir/editar; `null` si no hay error. */
  submitError?: string | null;

  /** Cambia el filtro de ubicación. */
  onChangeFilter: (value: FridgeLocationFilter) => void;
  /** Abre el diálogo de "Añadir". */
  onOpenAdd: () => void;
  /**
   * Abre el diálogo de "Añadir desde la compra" (importar los productos
   * marcados como comprados de una lista de la compra). Opcional: las vistas
   * solo pintan el botón si el container lo provee.
   */
  onOpenImport?: () => void;
  /** Abre el diálogo de edición para un ítem. */
  onOpenEdit: (item: FridgeListItem) => void;
  /** Cierra cualquier diálogo abierto (añadir o editar). */
  onCloseDialogs: () => void;
  /** Añade un producto al inventario. */
  onAdd: (input: AddFridgeItemInput) => void;
  /** Guarda los cambios de un producto existente. */
  onUpdate: (id: string, input: UpdateFridgeItemInput) => void;
  /** Elimina un producto (optimista en el container). */
  onDelete: (id: string) => void;
  /**
   * Ajusta la cantidad de un producto en `delta` unidades (stepper +/−).
   * El container parsea la cantidad actual (string), aplica el delta, hace
   * clamp a 0 (nunca negativa) y persiste el nuevo valor con un PATCH.
   * Opcional: las vistas solo pintan el stepper si el container lo provee.
   */
  onAdjustQuantity?: (id: string, delta: number) => void;
  /** Tira un producto: lo mueve a la ubicación "Tirado" (DISCARDED). */
  onThrow: (id: string) => void;
  /** Mueve un producto al congelador. */
  onFreeze: (id: string) => void;
  /** Mueve un producto del congelador de vuelta a la nevera. */
  onThaw?: (id: string) => void;
}
