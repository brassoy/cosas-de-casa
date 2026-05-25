import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticateRequestUseCase } from '../application/authenticate-request.use-case';
import { AuthDomainError } from '../domain/auth.errors';
import type { AuthenticatedUser } from '../domain/authenticated-user';

/** Petición Express con el usuario autenticado adjunto por el guard. */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard de autenticación. Extrae el Bearer token, lo verifica y aprovisiona el
 * usuario (JIT) mediante el caso de uso, y adjunta `request.user`. Responde 401
 * si falta el token o no es válido.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authenticate: AuthenticateRequestUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException('No estás autenticado.');
    }
    try {
      request.user = await this.authenticate.execute(token);
      return true;
    } catch (error) {
      if (error instanceof AuthDomainError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) {
      return null;
    }
    return value;
  }
}
