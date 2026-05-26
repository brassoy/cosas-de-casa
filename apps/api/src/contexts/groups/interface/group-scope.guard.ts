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
  GROUP_REPOSITORY,
  type GroupRepository,
} from '../domain/ports/group.repository';
import type { GroupRole } from '../domain/group-role';
import { GROUP_ROLES_KEY } from './group-roles.decorator';

/**
 * Guard de ámbito de peña (enforcement PRIMARIO de autorización).
 *
 * - Exige que el usuario autenticado sea MIEMBRO de la peña de la ruta
 *   (`:id` o `:groupId`); si no, 403.
 * - Si el endpoint declara `@GroupRoles('OWNER')`, exige además ese rol; si no, 403.
 * - Si la peña no existe, 404.
 *
 * Debe ejecutarse DESPUÉS de {@link JwtAuthGuard} (necesita `request.user`).
 */
@Injectable()
export class GroupScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const groupId = (request.params?.id ?? request.params?.groupId) as string | undefined;
    if (!groupId) {
      return true;
    }

    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new NotFoundException('La peña no existe.');
    }

    const membership = group.membershipOf(user.id);
    if (!membership) {
      throw new ForbiddenException('No perteneces a esta peña.');
    }

    const requiredRoles = this.reflector.getAllAndOverride<GroupRole[] | undefined>(GROUP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Solo el propietario puede hacer esto.');
    }

    return true;
  }
}
