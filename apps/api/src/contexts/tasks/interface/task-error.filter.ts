import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidTaskTransitionError,
  NotTaskFamilyMemberError,
  TaskDomainError,
  TaskNotFoundError,
  TaskPhotoNotFoundError,
  TaskTitleEmptyError,
} from '../domain/task.errors';

/**
 * Traduce los errores de dominio del contexto `tasks` a respuestas HTTP.
 * El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(TaskDomainError)
export class TaskErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(TaskErrorFilter.name);

  catch(error: TaskDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: TaskDomainError): number {
    if (error instanceof TaskNotFoundError || error instanceof TaskPhotoNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof NotTaskFamilyMemberError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof InvalidTaskTransitionError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof TaskTitleEmptyError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
