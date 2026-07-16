import { z } from 'zod';
import { UuidSchema } from './common';

// ── Tipos de utilidad ────────────────────────────────────────────────────────

/** Hora local "HH:mm" (24h). */
export const TimeHHmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado: HH:mm');
export type TimeHHmm = z.infer<typeof TimeHHmmSchema>;

/** Fecha de calendario "YYYY-MM-DD" (sin hora ni zona). */
export const DateYMDSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD');
export type DateYMD = z.infer<typeof DateYMDSchema>;

// ── Item del catálogo familiar ────────────────────────────────────────────────

/**
 * Item reutilizable del catálogo de rutinas de la familia.
 * La regla es orientativa por semana: `targetTimesPerWeek` veces en la ventana
 * horaria por defecto. La ventana PUEDE cruzar medianoche ("22:00" → "12:00").
 */
export const RoutineItemDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  /** Nombre visible, admite emoji (p. ej. "Trabajo ☀️ Pablo"). */
  name: z.string().min(1).max(100),
  /** Veces por semana que la regla espera asignar el item (1..7). */
  targetTimesPerWeek: z.number().int().min(1).max(7),
  defaultStartTime: TimeHHmmSchema,
  defaultEndTime: TimeHHmmSchema,
  /** Tags libres para agrupar en resúmenes y estadísticas (p. ej. "pablo"). */
  tags: z.array(z.string().min(1).max(30)),
  /** Soft-archive: un item archivado no se ofrece al crear rutinas nuevas. */
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RoutineItemDto = z.infer<typeof RoutineItemDtoSchema>;

// ── Incidencia ────────────────────────────────────────────────────────────────

export const RoutineIncidentDtoSchema = z.object({
  id: UuidSchema,
  assignmentId: UuidSchema,
  description: z.string().min(1).max(1000),
  /** Minutos perdidos que se descuentan del tiempo real. Null si no aplica. */
  lostMinutes: z.number().int().min(0).nullable(),
  createdBy: UuidSchema.nullable(),
  createdAt: z.string().datetime(),
});
export type RoutineIncidentDto = z.infer<typeof RoutineIncidentDtoSchema>;

// ── Asignación (item colocado en un día de la rutina) ─────────────────────────

export const RoutineAssignmentDtoSchema = z.object({
  id: UuidSchema,
  routineId: UuidSchema,
  routineItemId: UuidSchema,
  /** Offset del día dentro de la rutina (0..6, 0 = startDate). */
  dayIndex: z.number().int().min(0).max(6),
  /** Fecha real del día (startDate + dayIndex), derivada por la API. */
  date: DateYMDSchema,
  startTime: TimeHHmmSchema,
  endTime: TimeHHmmSchema,
  /**
   * Duración en minutos, calculada por la API con aritmética modular:
   * "22:00" → "12:00" cruza medianoche y son 840 minutos.
   */
  durationMinutes: z.number().int().min(1),
  incidents: z.array(RoutineIncidentDtoSchema),
});
export type RoutineAssignmentDto = z.infer<typeof RoutineAssignmentDtoSchema>;

// ── Selección (item elegido para la semana, con snapshot de la regla) ─────────

export const RoutineSelectionDtoSchema = z.object({
  routineItemId: UuidSchema,
  /** Nombre y tags aplanados del item para render sin query extra. */
  name: z.string().min(1).max(100),
  tags: z.array(z.string()),
  /**
   * Snapshot del target al seleccionar el item: el cumplimiento queda
   * registrado aunque la regla del catálogo cambie después.
   */
  targetTimesPerWeek: z.number().int().min(1).max(7),
  /** Días con asignación de este item en la rutina (derivado). */
  assignedCount: z.number().int().min(0),
  /** assignedCount >= targetTimesPerWeek (derivado, nunca almacenado). */
  isCompliant: z.boolean(),
});
export type RoutineSelectionDto = z.infer<typeof RoutineSelectionDtoSchema>;

// ── Rutina (instancia semanal) ────────────────────────────────────────────────

export const RoutineDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  /** Etiqueta opcional; la UI muestra "Semana del …" si es null. */
  name: z.string().min(1).max(100).nullable(),
  /** Primer día de la rutina (cualquier día de la semana). */
  startDate: DateYMDSchema,
  /** Último día (startDate + 6), derivado por la API. */
  endDate: DateYMDSchema,
  selections: z.array(RoutineSelectionDtoSchema),
  assignments: z.array(RoutineAssignmentDtoSchema),
  createdBy: UuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RoutineDto = z.infer<typeof RoutineDtoSchema>;

/** Versión ligera para listados. */
export const RoutineListItemDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  name: z.string().min(1).max(100).nullable(),
  startDate: DateYMDSchema,
  endDate: DateYMDSchema,
  itemCount: z.number().int().min(0),
  assignmentCount: z.number().int().min(0),
  incidentCount: z.number().int().min(0),
});
export type RoutineListItemDto = z.infer<typeof RoutineListItemDtoSchema>;

// ── Resumen de una rutina ─────────────────────────────────────────────────────

export const RoutineSummaryPerItemSchema = z.object({
  routineItemId: UuidSchema,
  name: z.string(),
  tags: z.array(z.string()),
  targetTimesPerWeek: z.number().int().min(1).max(7),
  assignedCount: z.number().int().min(0),
  isCompliant: z.boolean(),
  plannedMinutes: z.number().int().min(0),
  lostMinutes: z.number().int().min(0),
  /** plannedMinutes − lostMinutes (nunca negativo). */
  actualMinutes: z.number().int().min(0),
  incidentCount: z.number().int().min(0),
});
export type RoutineSummaryPerItem = z.infer<typeof RoutineSummaryPerItemSchema>;

export const RoutineSummaryPerTagSchema = z.object({
  tag: z.string(),
  plannedMinutes: z.number().int().min(0),
  lostMinutes: z.number().int().min(0),
  actualMinutes: z.number().int().min(0),
  incidentCount: z.number().int().min(0),
});
export type RoutineSummaryPerTag = z.infer<typeof RoutineSummaryPerTagSchema>;

export const RoutineSummaryDtoSchema = z.object({
  routineId: UuidSchema,
  startDate: DateYMDSchema,
  endDate: DateYMDSchema,
  perItem: z.array(RoutineSummaryPerItemSchema),
  perTag: z.array(RoutineSummaryPerTagSchema),
  totals: z.object({
    plannedMinutes: z.number().int().min(0),
    lostMinutes: z.number().int().min(0),
    actualMinutes: z.number().int().min(0),
    incidentCount: z.number().int().min(0),
    /** Asignaciones hechas / asignaciones que pedían las reglas (0..1). */
    complianceRate: z.number().min(0).max(1),
  }),
});
export type RoutineSummaryDto = z.infer<typeof RoutineSummaryDtoSchema>;

// ── Estadísticas globales (todas las rutinas, filtrables por fecha) ───────────

export const RoutineStatsPerItemSchema = z.object({
  routineItemId: UuidSchema,
  name: z.string(),
  tags: z.array(z.string()),
  /** Rutinas del rango en las que el item fue seleccionado. */
  routineCount: z.number().int().min(0),
  targetTotal: z.number().int().min(0),
  assignedTotal: z.number().int().min(0),
  complianceRate: z.number().min(0).max(1),
  plannedMinutes: z.number().int().min(0),
  lostMinutes: z.number().int().min(0),
  actualMinutes: z.number().int().min(0),
  incidentCount: z.number().int().min(0),
});
export type RoutineStatsPerItem = z.infer<typeof RoutineStatsPerItemSchema>;

export const RoutineStatsPerTagSchema = z.object({
  tag: z.string(),
  plannedMinutes: z.number().int().min(0),
  lostMinutes: z.number().int().min(0),
  actualMinutes: z.number().int().min(0),
  incidentCount: z.number().int().min(0),
});
export type RoutineStatsPerTag = z.infer<typeof RoutineStatsPerTagSchema>;

export const RoutineStatsDtoSchema = z.object({
  /** Rango efectivo aplicado; null si no se filtró ese extremo. */
  from: DateYMDSchema.nullable(),
  to: DateYMDSchema.nullable(),
  totals: z.object({
    routineCount: z.number().int().min(0),
    plannedMinutes: z.number().int().min(0),
    lostMinutes: z.number().int().min(0),
    actualMinutes: z.number().int().min(0),
    incidentCount: z.number().int().min(0),
    targetTotal: z.number().int().min(0),
    assignedTotal: z.number().int().min(0),
    complianceRate: z.number().min(0).max(1),
  }),
  perItem: z.array(RoutineStatsPerItemSchema),
  perTag: z.array(RoutineStatsPerTagSchema),
});
export type RoutineStatsDto = z.infer<typeof RoutineStatsDtoSchema>;

// ── Payloads de entrada ───────────────────────────────────────────────────────

/** Payload para crear un item del catálogo. */
export const CreateRoutineItemInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetTimesPerWeek: z.number().int().min(1).max(7),
  defaultStartTime: TimeHHmmSchema,
  defaultEndTime: TimeHHmmSchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export type CreateRoutineItemInput = z.infer<typeof CreateRoutineItemInputSchema>;

/** Payload para editar un item del catálogo (patch parcial). */
export const UpdateRoutineItemInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetTimesPerWeek: z.number().int().min(1).max(7).optional(),
  defaultStartTime: TimeHHmmSchema.optional(),
  defaultEndTime: TimeHHmmSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  /** true archiva el item; false lo restaura. */
  archived: z.boolean().optional(),
});
export type UpdateRoutineItemInput = z.infer<typeof UpdateRoutineItemInputSchema>;

/** Parámetros para listar el catálogo. */
export const ListRoutineItemsQuerySchema = z.object({
  /** Query param: llega como string. "true" incluye los archivados. */
  includeArchived: z.enum(['true', 'false']).optional(),
});
export type ListRoutineItemsQuery = z.infer<typeof ListRoutineItemsQuerySchema>;

/**
 * Payload para crear la rutina de una semana.
 * Si `duplicateFromRoutineId` viene, se copian selección y asignaciones de esa
 * rutina (sin incidencias) e `itemIds` se ignora.
 */
export const CreateRoutineInputSchema = z.object({
  startDate: DateYMDSchema,
  name: z.string().trim().min(1).max(100).optional(),
  /** Items del catálogo seleccionados para la semana. */
  itemIds: z.array(UuidSchema).optional(),
  duplicateFromRoutineId: UuidSchema.optional(),
});
export type CreateRoutineInput = z.infer<typeof CreateRoutineInputSchema>;

/** Payload para editar una rutina (solo la etiqueta; startDate es inmutable). */
export const UpdateRoutineInputSchema = z.object({
  name: z.string().trim().min(1).max(100).nullable().optional(),
});
export type UpdateRoutineInput = z.infer<typeof UpdateRoutineInputSchema>;

/**
 * Payload para reemplazar la selección de items de la rutina. Los items
 * quitados pierden sus asignaciones (e incidencias) en cascada.
 */
export const SetRoutineItemsInputSchema = z.object({
  itemIds: z.array(UuidSchema),
});
export type SetRoutineItemsInput = z.infer<typeof SetRoutineItemsInputSchema>;

/**
 * Payload para asignar un item a un día. Si se omite la ventana horaria se usa
 * la del item del catálogo.
 */
export const CreateAssignmentInputSchema = z.object({
  routineItemId: UuidSchema,
  dayIndex: z.number().int().min(0).max(6),
  startTime: TimeHHmmSchema.optional(),
  endTime: TimeHHmmSchema.optional(),
});
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentInputSchema>;

/** Payload para mover una asignación de día o ajustar su ventana horaria. */
export const UpdateAssignmentInputSchema = z.object({
  dayIndex: z.number().int().min(0).max(6).optional(),
  startTime: TimeHHmmSchema.optional(),
  endTime: TimeHHmmSchema.optional(),
});
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentInputSchema>;

/** Payload para abrir una incidencia sobre una asignación. */
export const CreateIncidentInputSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  /** Minutos perdidos a descontar del tiempo real (0..1440). */
  lostMinutes: z.number().int().min(0).max(1440).optional(),
});
export type CreateIncidentInput = z.infer<typeof CreateIncidentInputSchema>;

/** Parámetros para listar rutinas cuyo rango solapa [from, to]. */
export const ListRoutinesQuerySchema = z.object({
  from: DateYMDSchema.optional(),
  to: DateYMDSchema.optional(),
});
export type ListRoutinesQuery = z.infer<typeof ListRoutinesQuerySchema>;

/** Parámetros de las estadísticas globales (rutinas que solapan el rango). */
export const RoutineStatsQuerySchema = z.object({
  from: DateYMDSchema.optional(),
  to: DateYMDSchema.optional(),
});
export type RoutineStatsQuery = z.infer<typeof RoutineStatsQuerySchema>;
