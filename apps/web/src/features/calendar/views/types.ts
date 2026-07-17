/**
 * Contrato de props de la pantalla de la feature `calendar`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable `calendar.tsx`)
 * reconciliado con los DTOs reales de `@cosasdecasa/contracts`:
 *
 *  - El kit usaba tipos locales `CalendarEvent` / `TaskAssignee`. Aquí se usan los
 *    DTOs reales que devuelven los hooks: `CalendarEventDto` y `FamilyMemberDto`.
 *    `description`/`location`/`endsAt`/`recurrenceRule` son `string | null` (no
 *    opcionales) y `attendees` es `{ userId }[]` (no `string[]`).
 *  - El kit mezclaba dos componentes (`CalendarPage` + `CalendarEventModal`) con
 *    estado local de modales. Aquí TODO el estado de los sub-flujos (panel de día,
 *    modal de evento, edición vs creación, ocurrencia read-only, errores de
 *    mutación) lo COMPUTA el container y lo pasa por props: la vista es pura.
 *
 * Zona horaria (la maneja el CONTAINER, no la vista):
 *  - Los eventos llegan en ISO UTC; se muestran en hora local del navegador.
 *  - El rango del mes visible (6 semanas, lunes primero) y la conversión
 *    UTC↔local de los `datetime-local` los calcula el container.
 *
 * Recurrencia (RRULE):
 *  - Las ocurrencias expandidas tienen id con sufijo `_occ_N` y son de SOLO
 *    LECTURA. El container marca `isRecurringOccurrence` cuando el evento abierto
 *    es una ocurrencia; la vista deshabilita la edición y muestra el aviso
 *    "Se edita el evento original".
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import type {
  CalendarEventDto,
  FamilyMemberDto,
} from '@cosasdecasa/contracts';

export type { CalendarEventDto, FamilyMemberDto } from '@cosasdecasa/contracts';

/** Vista activa del calendario: semana, rejilla mensual o lista de agenda. */
export type CalendarViewMode = 'week' | 'month' | 'agenda';

/**
 * Clases del ring sutil que marca los días cubiertos por una rutina. Helper
 * COMPARTIDO por las 4 vistas de theme para que el borde por semana sea
 * idéntico en todas: dos colores alternos (info/warning) separan una semana de
 * rutina de la siguiente. `ring-inset` no rompe los bordes propios del grid.
 */
export function routineRingClass(info?: { colorIndex: 0 | 1 }): string {
  if (!info) return '';
  return info.colorIndex === 0
    ? 'ring-1 ring-inset ring-info/50'
    : 'ring-1 ring-inset ring-warning/60';
}

/**
 * Valores que emite el modal de evento al guardar. Son los campos del formulario
 * en hora LOCAL del usuario (`startsAt`/`endsAt` como "YYYY-MM-DDTHH:mm" del
 * input `datetime-local`, o "YYYY-MM-DD" cuando `allDay`). El container los
 * convierte a ISO UTC y separa el payload de PATCH/POST del de asistentes.
 */
export interface CalendarEventFormValues {
  title: string;
  description?: string;
  location?: string;
  /** Valor local del input: "YYYY-MM-DDTHH:mm" (o "YYYY-MM-DD" si allDay). */
  startsAt: string;
  /** Valor local del input de fin; vacío/omitido si no hay fin. */
  endsAt?: string;
  allDay: boolean;
  /** RRULE iCal opcional (textarea/avanzado del modal). */
  recurrenceRule?: string;
  /** IDs de los asistentes seleccionados. */
  attendeeIds: string[];
}

export interface CalendarViewProps {
  // ── Datos ──────────────────────────────────────────────────────────────────
  /**
   * Eventos del mes visible (incluye días adyacentes de la rejilla y
   * ocurrencias). También incluye los eventos VIRTUALES de rutina (overlay de
   * solo lectura, id `routine_<assignmentId>`): al abrirlos, el container
   * navega a la rutina en vez de abrir el modal.
   */
  events: CalendarEventDto[];
  /** Miembros de la familia, para seleccionar asistentes y resolver nombres. */
  members: FamilyMemberDto[];
  /**
   * Días cubiertos por una rutina ("YYYY-MM-DD" local → colorIndex). La vista
   * rodea esas celdas con un ring sutil; los dos colores alternos separan una
   * semana de rutina de la siguiente. Opcional: sin rutinas no se pinta nada.
   */
  routineDays?: Record<string, { colorIndex: 0 | 1 }>;
  /** Carga de eventos en curso. */
  isLoading?: boolean;
  /** Mensaje de error de la carga; `null`/`undefined` si no hay error. */
  error?: string | null;

  // ── Estado de la vista (Zustand, lo provee el container) ────────────────────
  /** Vista activa: rejilla mensual o agenda. */
  view: CalendarViewMode;
  /** Año del mes visible. */
  viewYear: number;
  /** Mes visible (0-indexed, igual que Date.getMonth). */
  viewMonth: number;
  /** Lunes de la semana visible (vista semanal). */
  weekStart: Date;
  /** Día seleccionado (resaltado en la rejilla), o `null`. */
  selectedDay: Date | null;

  // ── Estado del panel de día (controlado por el container) ───────────────────
  /** El panel lateral de eventos del día está abierto. */
  isDayPanelOpen?: boolean;

  // ── Estado del modal de evento (controlado por el container) ────────────────
  /** El modal de crear/editar evento está abierto. */
  isEventModalOpen?: boolean;
  /** Evento en edición, o `null` si el modal está en modo creación. */
  editingEvent?: CalendarEventDto | null;
  /**
   * Fecha pre-rellenada al crear desde un día (hora local). `null` en el botón
   * global "Nuevo evento" (usa la hora actual).
   */
  initialDate?: Date | null;
  /**
   * El evento abierto es una ocurrencia recurrente (`_occ_N`): SOLO LECTURA.
   * La vista deshabilita la edición y muestra "Se edita el evento original".
   * Lo calcula el container con `isOccurrenceId`.
   */
  isRecurringOccurrence?: boolean;
  /** Id del evento padre (sin sufijo `_occ_N`), para el aviso de ocurrencia. */
  parentEventId?: string | null;
  /** Una mutación (crear/actualizar/asistentes/borrar) está en curso. */
  isSubmitting?: boolean;
  /** El borrado pide confirmación de dos toques (estado del container). */
  confirmDelete?: boolean;
  /** Error de la última mutación del modal; `null` si no hay error. */
  submitError?: string | null;

  // ── Callbacks de navegación de mes / vista ──────────────────────────────────
  /** Cambia entre rejilla mensual y agenda. */
  onChangeView: (view: CalendarViewMode) => void;
  /** Va al mes anterior. */
  onPrevMonth: () => void;
  /** Va al mes siguiente. */
  onNextMonth: () => void;
  /** Va a la semana anterior (vista semanal). */
  onPrevWeek: () => void;
  /** Va a la semana siguiente (vista semanal). */
  onNextWeek: () => void;
  /** Vuelve al mes/semana actual (y selecciona hoy). */
  onToday: () => void;

  // ── Callbacks de selección / apertura ───────────────────────────────────────
  /** Selecciona un día y abre su panel de eventos. */
  onSelectDay: (date: Date) => void;
  /** Cierra el panel de día. */
  onCloseDayPanel: () => void;
  /** Abre el modal de edición para un evento (o de solo lectura si es ocurrencia). */
  onOpenEvent: (event: CalendarEventDto) => void;
  /** Abre el modal de creación (sin fecha pre-rellenada). */
  onNewEvent: () => void;
  /** Abre el modal de creación pre-rellenado con un día concreto. */
  onNewEventForDay: (date: Date) => void;
  /** Cierra el modal de evento. */
  onCloseEventModal: () => void;

  // ── Callbacks de mutación (las mutaciones reales viven en el container) ──────
  /**
   * Guarda el evento. El container decide crear (POST) o actualizar (PATCH +
   * PUT /attendees) según `editingEvent`, convierte fechas a ISO UTC y mantiene
   * el modal abierto mostrando `submitError` si falla.
   */
  onSubmitEvent: (values: CalendarEventFormValues) => void;
  /**
   * Solicita el borrado del evento en edición. El primer toque pide confirmación
   * (`confirmDelete=true`); el segundo ejecuta el DELETE en el container.
   */
  onDeleteEvent: () => void;
}
