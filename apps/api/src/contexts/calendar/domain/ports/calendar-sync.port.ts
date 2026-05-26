import type { CalendarEvent } from '../calendar-event';

/**
 * Puerto de sincronización con calendarios externos (p.ej. Google Calendar).
 *
 * Actualmente se implementa con un adaptador NO-OP porque la integración con
 * Google Calendar requiere credenciales OAuth que aún no están disponibles.
 *
 * TODO(Fase 4 – Google Calendar): implementar GoogleCalendarSyncAdapter:
 *   - Configurar OAuth 2.0 con las credenciales del proyecto de Google Cloud.
 *   - Usar googleapis npm package (o fetch directo a la API v3).
 *   - Gestionar refresh tokens por usuario/familia.
 *   - Mapear CalendarEvent → Google Event resource.
 */
export interface CalendarSyncPort {
  /**
   * Envía el evento al calendario externo.
   * @returns externalId asignado por el proveedor externo (si aplica), o null.
   */
  pushEvent(event: CalendarEvent): Promise<string | null>;

  /**
   * Elimina el evento del calendario externo.
   * @param externalId ID asignado previamente por pushEvent.
   */
  deleteEvent(externalId: string): Promise<void>;
}

export const CALENDAR_SYNC_PORT = Symbol('CALENDAR_SYNC_PORT');
