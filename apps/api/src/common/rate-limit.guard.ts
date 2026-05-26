/**
 * Guard simple de rate-limiting en memoria para endpoints costosos (IA).
 *
 * Usa un mapa de contador deslizante por userId+endpoint.
 * Diseñado para endpoints donde @nestjs/throttler no está disponible.
 *
 * Configuración por defecto: 5 peticiones / 60 segundos.
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../contexts/identity-access/interface/jwt-auth.guard';

export interface RateLimitOptions {
  limit: number;   // máximo número de peticiones
  ttl: number;     // ventana en ms
}

export const RATE_LIMIT_KEY = 'rate_limit_options';
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);

interface WindowEntry {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, WindowEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!opts) return true; // Sin anotación → sin límite

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id ?? request.ip ?? 'anon';
    const endpoint = `${request.method}:${request.route?.path ?? request.path}`;
    const key = `${userId}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - opts.ttl;

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }

    // Limpiar timestamps fuera de la ventana
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= opts.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_REQUESTS',
          message: `Demasiadas peticiones. Máximo ${opts.limit} por ${opts.ttl / 1000}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.timestamps.push(now);
    return true;
  }
}
