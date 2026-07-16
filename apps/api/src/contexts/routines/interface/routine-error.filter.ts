import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  DayIndexOutOfRangeError,
  DuplicateAssignmentError,
  IncidentDescriptionEmptyError,
  InvalidRoutineDateError,
  InvalidTargetError,
  InvalidTimeWindowError,
  ItemNotSelectedError,
  LostMinutesExceedPlannedError,
  RoutineAssignmentNotFoundError,
  RoutineDomainError,
  RoutineIncidentNotFoundError,
  RoutineItemArchivedError,
  RoutineItemNameEmptyError,
  RoutineItemNotFoundError,
  RoutineNotFoundError,
  RoutineOverlapError,
} from '../domain/routine.errors';

/**
 * Traduce los errores de dominio del contexto `routines` a respuestas HTTP.
 * El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(RoutineDomainError)
export class RoutineErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(RoutineErrorFilter.name);

  catch(error: RoutineDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: RoutineDomainError): number {
    if (
      error instanceof RoutineNotFoundError ||
      error instanceof RoutineItemNotFoundError ||
      error instanceof RoutineAssignmentNotFoundError ||
      error instanceof RoutineIncidentNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      error instanceof RoutineOverlapError ||
      error instanceof DuplicateAssignmentError ||
      error instanceof RoutineItemArchivedError
    ) {
      return HttpStatus.CONFLICT;
    }
    if (
      error instanceof InvalidRoutineDateError ||
      error instanceof InvalidTimeWindowError ||
      error instanceof DayIndexOutOfRangeError ||
      error instanceof ItemNotSelectedError ||
      error instanceof LostMinutesExceedPlannedError ||
      error instanceof RoutineItemNameEmptyError ||
      error instanceof InvalidTargetError ||
      error instanceof IncidentDescriptionEmptyError
    ) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
