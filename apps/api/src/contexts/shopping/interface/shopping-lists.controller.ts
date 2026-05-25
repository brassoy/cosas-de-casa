import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  ShoppingListSummaryDto,
  ListWithItemsDto,
  ShoppingItemDto,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';
import { EnsureAndListListsUseCase } from '../application/ensure-and-list-lists.use-case';
import { CreateCustomListUseCase } from '../application/create-custom-list.use-case';
import { GetListWithItemsUseCase } from '../application/get-list-with-items.use-case';
import { AddItemUseCase } from '../application/add-item.use-case';
import { DeleteCustomListUseCase } from '../application/delete-custom-list.use-case';
import { CreateListDto } from './dto/create-list.dto';
import { AddItemDto } from './dto/add-item.dto';
import { ShoppingErrorFilter } from './shopping-error.filter';
import { ListScopeGuard } from './list-scope.guard';
import { ShoppingPresenter } from './shopping.presenter';

/**
 * Controller de listas y de ítems ligados a una lista.
 *
 * Rutas bajo `/api/v1/families/:familyId/lists` → requieren {@link FamilyScopeGuard}.
 * Rutas bajo `/api/v1/lists/:listId` → requieren {@link ListScopeGuard}.
 */
@ApiBearerAuth()
@UseFilters(ShoppingErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('shopping')
export class ShoppingListsController {
  constructor(
    private readonly ensureAndListLists: EnsureAndListListsUseCase,
    private readonly createCustomList: CreateCustomListUseCase,
    private readonly getListWithItems: GetListWithItemsUseCase,
    private readonly addItem: AddItemUseCase,
    private readonly deleteCustomList: DeleteCustomListUseCase,
  ) {}

  // ── Rutas con familyId (guard de familia) ─────────────────────────────────

  @Get('families/:familyId/lists')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar las listas de la compra de una familia (crea la MAIN si no existe).' })
  @ApiOkResponse({ description: 'Listas de la familia.' })
  async listLists(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<ShoppingListSummaryDto[]> {
    const lists = await this.ensureAndListLists.execute({
      familyId,
      actingUserId: user.id,
    });
    return lists.map((l) => ShoppingPresenter.toListSummaryDto(l));
  }

  @Post('families/:familyId/lists')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear una lista personalizada para una familia.' })
  @ApiCreatedResponse({ description: 'Lista creada.' })
  async createList(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateListDto,
  ): Promise<ShoppingListSummaryDto> {
    const list = await this.createCustomList.execute({
      familyId,
      name: body.name,
      actingUserId: user.id,
    });
    return ShoppingPresenter.toListSummaryDto(list);
  }

  // ── Rutas con listId (guard de lista) ────────────────────────────────────

  @Get('lists/:listId')
  @UseGuards(ListScopeGuard)
  @ApiOperation({ summary: 'Obtener una lista con todos sus artículos.' })
  @ApiOkResponse({ description: 'Lista con artículos.' })
  async getList(
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<ListWithItemsDto> {
    const { list, items } = await this.getListWithItems.execute({ listId });
    return ShoppingPresenter.toListWithItemsDto(list, items);
  }

  @Post('lists/:listId/items')
  @UseGuards(ListScopeGuard)
  @ApiOperation({ summary: 'Añadir un artículo a una lista.' })
  @ApiCreatedResponse({ description: 'Artículo añadido.' })
  async addItemToList(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() body: AddItemDto,
  ): Promise<ShoppingItemDto> {
    const item = await this.addItem.execute({
      listId,
      actingUserId: user.id,
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      description: body.description,
      purchaseLink: body.purchaseLink,
    });
    return ShoppingPresenter.toItemDto(item);
  }

  @Delete('lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ListScopeGuard)
  @ApiOperation({ summary: 'Eliminar una lista personalizada (la MAIN no se puede borrar).' })
  @ApiNoContentResponse({ description: 'Lista eliminada.' })
  async deleteList(
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<void> {
    await this.deleteCustomList.execute({ listId });
  }
}
