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
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepository,
} from '../domain/ports/shopping-list.repository';

/**
 * Guard de ámbito de lista de la compra.
 *
 * Para rutas sin `:familyId` (p. ej. GET /lists/:listId, POST /lists/:listId/items):
 * 1. Carga la lista para obtener su `familyId`.
 * 2. Verifica que el usuario autenticado sea miembro de esa familia.
 *
 * Adjunta la lista cargada en `request.shoppingList` para evitar una segunda
 * consulta en el controller (aunque los casos de uso la recargan por sencillez).
 */
@Injectable()
export class ListScopeGuard implements CanActivate {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY) private readonly lists: ShoppingListRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const listId = request.params?.listId as string | undefined;
    if (!listId) {
      return true;
    }

    const list = await this.lists.findById(listId);
    if (!list) {
      throw new NotFoundException('La lista no existe.');
    }

    const family = await this.families.findById(list.familyId);
    if (!family) {
      throw new NotFoundException('La familia de esta lista no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de esta lista.');
    }

    return true;
  }
}
