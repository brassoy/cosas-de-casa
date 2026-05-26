import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CalendarDomainError,
  CalendarEventNotFoundError,
  NotCalendarFamilyMemberError,
  CalendarEventTitleEmptyError,
  CalendarEventInvalidRangeError,
} from '../domain/calendar.errors';

/**
 * Traduce los errores de dominio del contexto `calendar` a respuestas HTTP.
 */
@Catch(CalendarDomainError)
export class CalendarErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(CalendarErrorFilter.name);

  catch(error: CalendarDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: CalendarDomainError): number {
    if (error instanceof CalendarEventNotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof NotCalendarFamilyMemberError) return HttpStatus.FORBIDDEN;
    if (error instanceof CalendarEventTitleEmptyError) return HttpStatus.UNPROCESSABLE_ENTITY;
    if (error instanceof CalendarEventInvalidRangeError) return HttpStatus.UNPROCESSABLE_ENTITY;
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
