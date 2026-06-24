import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiDomainError, AiUnavailableError } from '../domain/ai.errors';

/**
 * Traduce los errores de dominio del contexto `ai` a respuestas HTTP.
 * El cuerpo incluye un `code` estable para el cliente.
 */
@Catch(AiDomainError)
export class AiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AiErrorFilter.name);

  catch(error: AiDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: AiDomainError): number {
    if (error instanceof AiUnavailableError) return HttpStatus.SERVICE_UNAVAILABLE;
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
