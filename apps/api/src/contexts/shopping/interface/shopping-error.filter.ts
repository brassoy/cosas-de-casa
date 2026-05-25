import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CannotDeleteMainListError,
  ItemNameEmptyError,
  ItemNotFoundError,
  ListNotFoundError,
  MainListAlreadyExistsError,
  NotListFamilyMemberError,
  ShoppingDomainError,
} from '../domain/shopping.errors';

/**
 * Traduce los errores de dominio del contexto `shopping` a respuestas HTTP.
 * El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(ShoppingDomainError)
export class ShoppingErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ShoppingErrorFilter.name);

  catch(error: ShoppingDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: ShoppingDomainError): number {
    if (error instanceof ListNotFoundError || error instanceof ItemNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof NotListFamilyMemberError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof CannotDeleteMainListError || error instanceof MainListAlreadyExistsError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof ItemNameEmptyError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
