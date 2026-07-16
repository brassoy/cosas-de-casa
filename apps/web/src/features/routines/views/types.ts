/**
 * Contratos de props de las pantallas de la feature `routines`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para todos los
 * themes (hoy solo `base`; el registry cae a base por fallback). Presentacional
 * puro: solo props in / callbacks out — las queries y mutaciones viven en los
 * containers (`pages/*`).
 */

import type {
  RoutineDto,
  RoutineItemDto,
  RoutineListItemDto,
  RoutineStatsDto,
  RoutineSummaryDto,
} from '../types';

// ── Pantalla: lista de rutinas ────────────────────────────────────────────────

/** Valores del modal "Nueva rutina de esta semana". */
export interface RoutineFormValues {
  startDate: string;
  name?: string;
  /** Ids del catálogo seleccionados (se ignora si duplicateFromRoutineId). */
  itemIds: string[];
  duplicateFromRoutineId?: string;
}

export interface RoutinesViewProps {
  routines: RoutineListItemDto[];
  /** Catálogo activo, para elegir items al crear. */
  catalogItems: RoutineItemDto[];
  isLoading?: boolean;
  error?: string | null;

  isCreateOpen: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;
  /** Última rutina (para "duplicar la última"), o null si no hay ninguna. */
  lastRoutine: RoutineListItemDto | null;

  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onCreate: (values: RoutineFormValues) => void;
  onOpenRoutine: (routineId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
  onOpenItems: () => void;
  onOpenStats: () => void;
}

// ── Pantalla: catálogo de items ───────────────────────────────────────────────

export interface RoutineItemFormValues {
  name: string;
  targetTimesPerWeek: number;
  defaultStartTime: string;
  defaultEndTime: string;
  tags: string[];
}

export interface RoutineItemsViewProps {
  items: RoutineItemDto[];
  isLoading?: boolean;
  error?: string | null;
  showArchived: boolean;

  /** Item en edición, o null si el editor está en modo creación. */
  editingItem: RoutineItemDto | null;
  isEditorOpen: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;

  onToggleShowArchived: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: RoutineItemDto) => void;
  onCloseEditor: () => void;
  onSubmit: (values: RoutineItemFormValues) => void;
  /** Archiva o restaura según el estado actual del item. */
  onToggleArchived: (item: RoutineItemDto) => void;
  /** Borra (la API archiva sola si el item está en uso). */
  onDelete: (item: RoutineItemDto) => void;
  onBack: () => void;
}

// ── Pantalla: detalle de rutina (kanban) ──────────────────────────────────────

export type RoutineDetailTab = 'kanban' | 'summary';

export interface RoutineDetailViewProps {
  routine: RoutineDto | null;
  summary: RoutineSummaryDto | null;
  /** Catálogo activo, para el selector de items de la semana. */
  catalogItems: RoutineItemDto[];
  isLoading?: boolean;
  error?: string | null;

  activeTab: RoutineDetailTab;
  isItemPickerOpen: boolean;
  isMutating?: boolean;
  mutationError?: string | null;

  onChangeTab: (tab: RoutineDetailTab) => void;
  onOpenItemPicker: () => void;
  onCloseItemPicker: () => void;
  /** Reemplaza la selección de items de la semana. */
  onSubmitItems: (itemIds: string[]) => void;

  /** Asigna un item a un día con su ventana por defecto (drag o tap). */
  onAssign: (routineItemId: string, dayIndex: number) => void;
  /** Mueve una asignación de día (optimista). */
  onMoveAssignment: (assignmentId: string, dayIndex: number) => void;
  /** Ajusta la ventana horaria de una asignación. */
  onUpdateWindow: (assignmentId: string, startTime: string, endTime: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;

  /** Abre una incidencia sobre una asignación. */
  onCreateIncident: (
    assignmentId: string,
    description: string,
    lostMinutes?: number,
  ) => void;
  /** Edita una incidencia existente (lostMinutes null borra el descuento). */
  onUpdateIncident: (
    incidentId: string,
    description: string,
    lostMinutes: number | null,
  ) => void;
  onDeleteIncident: (incidentId: string) => void;

  onBack: () => void;
}

// ── Pantalla: estadísticas globales ───────────────────────────────────────────

export interface RoutineStatsViewProps {
  stats: RoutineStatsDto | null;
  isLoading?: boolean;
  error?: string | null;

  from: string;
  to: string;
  onChangeRange: (from: string, to: string) => void;
  onBack: () => void;
}
