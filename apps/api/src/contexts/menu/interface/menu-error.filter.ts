import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { MenuDomainError, MenuAiUnavailableError, MenuListNotFoundError } from '../domain/menu.errors';

@Catch(MenuDomainError)
export class MenuErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(MenuErrorFilter.name);

  catch(error: MenuDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: MenuDomainError): number {
    if (error instanceof MenuAiUnavailableError) return HttpStatus.SERVICE_UNAVAILABLE;
    if (error instanceof MenuListNotFoundError) return HttpStatus.NOT_FOUND;
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
