import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  PlanNotFoundError,
  PlanAccessDeniedError,
  PlanNotOwnedByFamilyError,
  PlansNotFriendsError,
  PlanAlreadySharedError,
  SavedPlaceNotFoundError,
  SavedPlaceAccessDeniedError,
  PlanFamilyMemberError,
  PlansDomainError,
} from '../domain/plans.errors';

@Catch(PlansDomainError)
export class PlansDomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(PlansDomainErrorFilter.name);

  catch(error: PlansDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: PlansDomainError): number {
    if (error instanceof PlanNotFoundError || error instanceof SavedPlaceNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      error instanceof PlanAccessDeniedError ||
      error instanceof PlanNotOwnedByFamilyError ||
      error instanceof SavedPlaceAccessDeniedError ||
      error instanceof PlanFamilyMemberError
    ) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof PlansNotFriendsError || error instanceof PlanAlreadySharedError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
