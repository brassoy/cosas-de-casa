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
  AlreadyMemberError,
  FamilyDomainError,
  FamilyNotFoundError,
  InvalidJoinPinError,
  LastOwnerError,
  NotAMemberError,
  NotAnOwnerError,
} from '../domain/family.errors';

type DomainError = FamilyDomainError | AuthDomainError;

/**
 * Traduce los errores de dominio (TS puro) a respuestas HTTP. Centraliza el
 * mapeo aquí para que dominio y casos de uso permanezcan agnósticos del
 * transporte. El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(FamilyDomainError, AuthDomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

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
    if (error instanceof FamilyNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof NotAMemberError || error instanceof NotAnOwnerError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof AlreadyMemberError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof LastOwnerError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof InvalidJoinPinError) {
      // 422: el código tiene forma válida pero no es canjeable.
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
