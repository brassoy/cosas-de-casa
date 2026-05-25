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
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';

/**
 * Guard de ámbito de ítem.
 *
 * Para rutas con `:itemId` (PATCH /items/:itemId, DELETE /items/:itemId,
 * GET/POST /items/:itemId/comments):
 * 1. Carga el ítem para obtener su `listId`.
 * 2. Carga la lista para obtener su `familyId`.
 * 3. Verifica que el usuario sea miembro de esa familia.
 */
@Injectable()
export class ItemScopeGuard implements CanActivate {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
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
      throw new NotFoundException('El artículo no existe.');
    }

    const list = await this.lists.findById(item.listId);
    if (!list) {
      throw new NotFoundException('La lista de este artículo no existe.');
    }

    const family = await this.families.findById(list.familyId);
    if (!family) {
      throw new NotFoundException('La familia de esta lista no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de este artículo.');
    }

    return true;
  }
}
