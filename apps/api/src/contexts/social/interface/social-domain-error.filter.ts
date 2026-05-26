import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AlreadyFriendsError,
  FriendLinkNotFoundError,
  InvalidFriendInvitePinError,
  NotFamilyMemberError,
  NotFamilyOwnerError,
  SelfFriendshipError,
  SocialDomainError,
} from '../domain/social.errors';

@Catch(SocialDomainError)
export class SocialDomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(SocialDomainErrorFilter.name);

  catch(error: SocialDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }

  private statusFor(error: SocialDomainError): number {
    if (error instanceof NotFamilyMemberError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof NotFamilyOwnerError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof FriendLinkNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof InvalidFriendInvitePinError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    if (error instanceof AlreadyFriendsError) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof SelfFriendshipError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    this.logger.warn(`Error de dominio sin mapear: ${error.code}`);
    return HttpStatus.BAD_REQUEST;
  }
}
