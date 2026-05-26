import { z } from 'zod';
import { UuidSchema } from './common';

// ── Asistente a evento ────────────────────────────────────────────────────────

export const EventAttendeeDtoSchema = z.object({
  userId: UuidSchema,
});
export type EventAttendeeDto = z.infer<typeof EventAttendeeDtoSchema>;

// ── Evento de calendario ──────────────────────────────────────────────────────

export const CalendarEventDtoSchema = z.object({
  id: UuidSchema,
  familyId: UuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  location: z.string().max(500).nullable(),
  /** ISO 8601 con zona horaria (timestamptz). */
  startsAt: z.string().datetime({ offset: true }),
  /** ISO 8601 con zona horaria (timestamptz). Null si el evento es puntual o no tiene fin definido. */
  endsAt: z.string().datetime({ offset: true }).nullable(),
  /** Si es true, el evento ocupa todo el día (sin hora significativa en startsAt/endsAt). */
  allDay: z.boolean(),
  /**
   * Regla de recurrencia iCal (RRULE).
   * Ejemplo: "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z"
   * Null si el evento no es recurrente.
   */
  recurrenceRule: z.string().nullable(),
  createdBy: UuidSchema.nullable(),
  attendees: z.array(EventAttendeeDtoSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type CalendarEventDto = z.infer<typeof CalendarEventDtoSchema>;

// ── Payloads de entrada ───────────────────────────────────────────────────────

/** Payload para crear un evento de calendario. */
export const CreateEventInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(500).optional(),
  /** ISO 8601 con zona horaria. */
  startsAt: z.string().datetime({ offset: true }),
  /** ISO 8601 con zona horaria. Debe ser >= startsAt si se indica. */
  endsAt: z.string().datetime({ offset: true }).optional(),
  allDay: z.boolean().optional(),
  /** RRULE iCal. Soportados: FREQ=DAILY|WEEKLY|MONTHLY, INTERVAL, UNTIL, COUNT. */
  recurrenceRule: z.string().max(500).optional(),
  /** IDs de los asistentes. Si se omite, el creador queda como único asistente. */
  attendeeIds: z.array(UuidSchema).optional(),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

/** Payload para editar un evento (patch parcial). */
export const UpdateEventInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  allDay: z.boolean().optional(),
  recurrenceRule: z.string().max(500).nullable().optional(),
});
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;

/** Payload para establecer la lista de asistentes (reemplaza la lista completa). */
export const SetAttendeesInputSchema = z.object({
  attendeeIds: z.array(UuidSchema),
});
export type SetAttendeesInput = z.infer<typeof SetAttendeesInputSchema>;

/** Parámetros de query para listar eventos en un rango de fechas. */
export const ListEventsQuerySchema = z.object({
  /** ISO 8601. Eventos con starts_at >= from. */
  from: z.string().datetime({ offset: true }),
  /** ISO 8601. Eventos con starts_at <= to. */
  to: z.string().datetime({ offset: true }),
});
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
