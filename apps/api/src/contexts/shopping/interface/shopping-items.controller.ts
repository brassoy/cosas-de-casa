import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import type { ShoppingItemDto, ItemCommentDto } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { UpdateItemUseCase } from '../application/update-item.use-case';
import { DeleteItemUseCase } from '../application/delete-item.use-case';
import { AddCommentUseCase } from '../application/add-comment.use-case';
import { ListCommentsUseCase } from '../application/list-comments.use-case';
import { UpdateItemDto } from './dto/update-item.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { ShoppingErrorFilter } from './shopping-error.filter';
import { ItemScopeGuard } from './item-scope.guard';
import { ShoppingPresenter } from './shopping.presenter';

/**
 * Controller de ítems y comentarios.
 *
 * Todas las rutas usan {@link ItemScopeGuard} para verificar
 * que el caller es miembro de la familia a la que pertenece el ítem.
 */
@ApiBearerAuth()
@UseFilters(ShoppingErrorFilter)
@UseGuards(JwtAuthGuard, ItemScopeGuard)
@Controller('items')
@ApiTags('shopping')
export class ShoppingItemsController {
  constructor(
    private readonly updateItem: UpdateItemUseCase,
    private readonly deleteItem: DeleteItemUseCase,
    private readonly addComment: AddCommentUseCase,
    private readonly listComments: ListCommentsUseCase,
  ) {}

  @Patch(':itemId')
  @ApiOperation({ summary: 'Editar un artículo (patch parcial: nombre, cantidad, unidad, estado, etc.).' })
  @ApiOkResponse({ description: 'Artículo actualizado.' })
  async update(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateItemDto,
  ): Promise<ShoppingItemDto> {
    const item = await this.updateItem.execute({
      itemId,
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      description: body.description,
      purchaseLink: body.purchaseLink,
      checked: body.checked,
      position: body.position,
    });
    return ShoppingPresenter.toItemDto(item);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un artículo.' })
  @ApiNoContentResponse({ description: 'Artículo eliminado.' })
  async delete(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.deleteItem.execute({ itemId });
  }

  @Get(':itemId/comments')
  @ApiOperation({ summary: 'Listar los comentarios de un artículo.' })
  @ApiOkResponse({ description: 'Comentarios del artículo.' })
  async getComments(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<ItemCommentDto[]> {
    const comments = await this.listComments.execute({ itemId });
    return comments.map((c) => ShoppingPresenter.toCommentDto(c));
  }

  @Post(':itemId/comments')
  @ApiOperation({ summary: 'Añadir un comentario a un artículo.' })
  @ApiCreatedResponse({ description: 'Comentario añadido.' })
  async addCommentToItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: AddCommentDto,
  ): Promise<ItemCommentDto> {
    const comment = await this.addComment.execute({
      itemId,
      actingUserId: user.id,
      body: body.body,
    });
    return ShoppingPresenter.toCommentDto(comment);
  }
}
