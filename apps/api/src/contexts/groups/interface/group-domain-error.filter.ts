import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthDomainError } from '../../identity-access/domain/auth.errors';
import {
  AlreadyGroupMemberError,
  GroupDomainError,
  GroupNotFoundError,
  InvalidGroupJoinPinError,
  LastGroupOwnerError,
  NotAGroupMemberError,
  NotAGroupOwnerError,
} from '../domain/group.errors';

type DomainError = GroupDomainError | AuthDomainError;

/**
 * Traduce los errores de dominio del contexto `groups` a respuestas HTTP.
 */
@Catch(GroupDomainError, AuthDomainError)
export class GroupDomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(GroupDomainErrorFilter.name);

  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: DomainError): number {
    if (error instanceof AuthDomainError) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (error instanceof GroupNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof NotAGroupMemberError || error instanceof NotAGroupOwnerError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof AlreadyGroupMemberError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof LastGroupOwnerError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof InvalidGroupJoinPinError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
