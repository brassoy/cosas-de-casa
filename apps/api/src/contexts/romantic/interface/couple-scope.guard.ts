import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../identity-access/interface/jwt-auth.guard';
import {
  COUPLE_REPOSITORY,
  type CoupleRepository,
} from '../domain/ports/couple.repository';

/**
 * Guard de ámbito de pareja.
 *
 * Para rutas con `:coupleId`: verifica que el usuario autenticado
 * sea uno de los dos miembros de la pareja.
 *
 * Decisión de privacidad: SOLO los dos miembros acceden al rincón.
 * El resto recibe 403 aunque sean de la misma familia.
 */
@Injectable()
export class CoupleScopeGuard implements CanActivate {
  constructor(
    @Inject(COUPLE_REPOSITORY) private readonly couples: CoupleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const coupleId = request.params?.coupleId as string | undefined;
    if (!coupleId) {
      return true;
    }

    const couple = await this.couples.findById(coupleId);
    if (!couple) {
      throw new NotFoundException('La pareja no existe.');
    }

    if (!couple.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a esta pareja.');
    }

    return true;
  }
}
