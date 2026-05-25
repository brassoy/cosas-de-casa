import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../identity-access/interface/jwt-auth.guard';
import {
  FAMILY_REPOSITORY,
  type FamilyRepository,
} from '../domain/ports/family.repository';
import type { MembershipRole } from '../domain/membership-role';
import { ROLES_KEY } from './roles.decorator';

/**
 * Guard de ámbito de familia (enforcement PRIMARIO de autorización).
 *
 * - Exige que el usuario autenticado sea MIEMBRO de la familia de la ruta
 *   (`:id` o `:familyId`); si no, 403.
 * - Si el endpoint declara `@Roles('OWNER')`, exige además ese rol; si no, 403.
 * - Si la familia no existe, 404.
 *
 * Debe ejecutarse DESPUÉS de {@link JwtAuthGuard} (necesita `request.user`).
 */
@Injectable()
export class FamilyScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const familyId = (request.params?.id ?? request.params?.familyId) as string | undefined;
    if (!familyId) {
      // Sin id de familia en la ruta no hay nada que comprobar aquí.
      return true;
    }

    const family = await this.families.findById(familyId);
    if (!family) {
      throw new NotFoundException('La familia no existe.');
    }

    const membership = family.membershipOf(user.id);
    if (!membership) {
      throw new ForbiddenException('No perteneces a esta familia.');
    }

    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Solo el propietario puede hacer esto.');
    }

    return true;
  }
}
