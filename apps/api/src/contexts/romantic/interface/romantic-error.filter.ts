import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  RomanticDomainError,
  CoupleNotFoundError,
  NotCoupleMemberError,
  NotFamilyMemberError,
  AlreadyInCoupleError,
  PartnerAlreadyInCoupleError,
  CannotCoupleWithSelfError,
  ChallengeNotFoundError,
  ChallengeAlreadyExistsError,
  CoupleNoteBodyEmptyError,
  CoupleNoteNotFoundError,
} from '../domain/romantic.errors';

/**
 * Traduce los errores de dominio del contexto `romantic` a respuestas HTTP.
 */
@Catch(RomanticDomainError)
export class RomanticErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(RomanticErrorFilter.name);

  catch(error: RomanticDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: RomanticDomainError): number {
    if (error instanceof CoupleNotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof CoupleNoteNotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ChallengeNotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof NotCoupleMemberError) return HttpStatus.FORBIDDEN;
    if (error instanceof NotFamilyMemberError) return HttpStatus.FORBIDDEN;
    if (error instanceof AlreadyInCoupleError) return HttpStatus.CONFLICT;
    if (error instanceof PartnerAlreadyInCoupleError) return HttpStatus.CONFLICT;
    if (error instanceof CannotCoupleWithSelfError) return HttpStatus.UNPROCESSABLE_ENTITY;
    if (error instanceof ChallengeAlreadyExistsError) return HttpStatus.CONFLICT;
    if (error instanceof CoupleNoteBodyEmptyError) return HttpStatus.UNPROCESSABLE_ENTITY;
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
