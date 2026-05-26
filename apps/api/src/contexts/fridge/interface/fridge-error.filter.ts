import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  FridgeDomainError,
  FridgeItemInsufficientQuantityError,
  FridgeItemInvalidQuantityError,
  FridgeItemNameEmptyError,
  FridgeItemNotFoundError,
  NotFridgeFamilyMemberError,
} from '../domain/fridge.errors';

/**
 * Traduce los errores de dominio del contexto `fridge` a respuestas HTTP.
 * El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(FridgeDomainError)
export class FridgeErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(FridgeErrorFilter.name);

  catch(error: FridgeDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: FridgeDomainError): number {
    if (error instanceof FridgeItemNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof NotFridgeFamilyMemberError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof FridgeItemNameEmptyError || error instanceof FridgeItemInvalidQuantityError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    if (error instanceof FridgeItemInsufficientQuantityError) {
      return HttpStatus.CONFLICT;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
