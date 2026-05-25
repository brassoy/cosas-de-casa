import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Inyecta el usuario autenticado (adjuntado por {@link JwtAuthGuard}) en un
 * parámetro del controller. Asume que el endpoint está protegido por el guard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser usado sin JwtAuthGuard: no hay usuario en la petición.');
    }
    return request.user;
  },
);
