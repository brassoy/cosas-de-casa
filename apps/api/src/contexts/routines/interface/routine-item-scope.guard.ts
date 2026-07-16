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
  ROUTINE_ITEM_REPOSITORY,
  type RoutineItemRepository,
} from '../domain/ports/routine-item.repository';

/**
 * Guard de ámbito de item del catálogo de rutinas.
 *
 * Para rutas sin `:familyId` (p. ej. PATCH /routine-items/:itemId):
 * 1. Carga el item para obtener su `familyId`.
 * 2. Verifica que el usuario autenticado sea miembro de esa familia.
 */
@Injectable()
export class RoutineItemScopeGuard implements CanActivate {
  constructor(
    @Inject(ROUTINE_ITEM_REPOSITORY) private readonly items: RoutineItemRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const itemId = request.params?.itemId as string | undefined;
    if (!itemId) {
      return true;
    }

    const item = await this.items.findById(itemId);
    if (!item) {
      throw new NotFoundException('El item de rutina no existe.');
    }

    const family = await this.families.findById(item.familyId);
    if (!family) {
      throw new NotFoundException('La familia de este item no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de este item.');
    }

    return true;
  }
}
