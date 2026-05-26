import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BudgetDomainError,
  ReceiptNotFoundError,
  NotBudgetFamilyMemberError,
  ReceiptInvalidTotalError,
  ReceiptLineTotalNegativeError,
  AiUnavailableError,
} from '../domain/budget.errors';

/**
 * Traduce los errores de dominio del contexto `budget` a respuestas HTTP.
 * El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(BudgetDomainError)
export class BudgetErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(BudgetErrorFilter.name);

  catch(error: BudgetDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: BudgetDomainError): number {
    if (error instanceof ReceiptNotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof NotBudgetFamilyMemberError) return HttpStatus.FORBIDDEN;
    if (error instanceof AiUnavailableError) return HttpStatus.SERVICE_UNAVAILABLE;
    if (
      error instanceof ReceiptInvalidTotalError ||
      error instanceof ReceiptLineTotalNegativeError
    ) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
