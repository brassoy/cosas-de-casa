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
  FAMILY_REPOSITORY,
  type FamilyRepository,
} from '../../family/domain/ports/family.repository';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../domain/ports/routine.repository';

/**
 * Guard de ámbito de rutina.
 *
 * Para rutas sin `:familyId` (p. ej. GET /routines/:routineId):
 * 1. Carga la rutina para obtener su `familyId`.
 * 2. Verifica que el usuario autenticado sea miembro de esa familia.
 */
@Injectable()
export class RoutineScopeGuard implements CanActivate {
  constructor(
    @Inject(ROUTINE_REPOSITORY) private readonly routines: RoutineRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const routineId = request.params?.routineId as string | undefined;
    if (!routineId) {
      return true;
    }

    const routine = await this.routines.findById(routineId);
    if (!routine) {
      throw new NotFoundException('La rutina no existe.');
    }

    const family = await this.families.findById(routine.familyId);
    if (!family) {
      throw new NotFoundException('La familia de esta rutina no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de esta rutina.');
    }

    return true;
  }
}
