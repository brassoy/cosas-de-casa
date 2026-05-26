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
  FRIDGE_ITEM_REPOSITORY,
  type FridgeItemRepository,
} from '../domain/ports/fridge-item.repository';

/**
 * Guard de ámbito de ítem de nevera.
 *
 * Para rutas sin `:familyId` (p. ej. GET /fridge-items/:itemId):
 * 1. Carga el ítem para obtener su `familyId`.
 * 2. Verifica que el usuario autenticado sea miembro de esa familia.
 */
@Injectable()
export class FridgeItemScopeGuard implements CanActivate {
  constructor(
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly fridgeItems: FridgeItemRepository,
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

    const item = await this.fridgeItems.findById(itemId);
    if (!item) {
      throw new NotFoundException('El ítem no existe.');
    }

    const family = await this.families.findById(item.familyId);
    if (!family) {
      throw new NotFoundException('La familia de este ítem no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de este ítem.');
    }

    return true;
  }
}
