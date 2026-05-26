import { Injectable, Logger } from '@nestjs/common';
import type { CalendarSyncPort } from '../domain/ports/calendar-sync.port';
import type { CalendarEvent } from '../domain/calendar-event';

/**
 * Adaptador NO-OP para CalendarSyncPort.
 *
 * Este adaptador no hace nada: registra un log de debug y devuelve null/void.
 *
 * Se cableará con Google Calendar en una fase posterior cuando estén disponibles
 * las credenciales OAuth 2.0 del proyecto de Google Cloud.
 *
 * TODO(Fase 4 – Google Calendar): sustituir por GoogleCalendarSyncAdapter.
 *   Pasos necesarios:
 *   1. Crear proyecto en Google Cloud Console → habilitar Calendar API.
 *   2. Configurar OAuth 2.0 con redirect URI de la app.
 *   3. Almacenar refresh tokens por usuario en una tabla `google_calendar_tokens`.
 *   4. Implementar GoogleCalendarSyncAdapter usando `googleapis` o fetch directo.
 */
@Injectable()
export class NoopCalendarSyncAdapter implements CalendarSyncPort {
  private readonly logger = new Logger(NoopCalendarSyncAdapter.name);

  async pushEvent(event: CalendarEvent): Promise<string | null> {
    this.logger.debug(
      `[noop] pushEvent: ${event.id} ("${event.title}") — Google Calendar pendiente de credenciales OAuth`,
    );
    return null;
  }

  async deleteEvent(externalId: string): Promise<void> {
    this.logger.debug(
      `[noop] deleteEvent: ${externalId} — Google Calendar pendiente de credenciales OAuth`,
    );
  }
}
