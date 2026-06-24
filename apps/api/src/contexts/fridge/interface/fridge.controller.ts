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
import type { FridgeItemDto } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { AddFridgeItemUseCase } from '../application/add-fridge-item.use-case';
import { ListFridgeItemsUseCase } from '../application/list-fridge-items.use-case';
import { GetFridgeItemUseCase } from '../application/get-fridge-item.use-case';
import { UpdateFridgeItemUseCase } from '../application/update-fridge-item.use-case';
import { DeleteFridgeItemUseCase } from '../application/delete-fridge-item.use-case';
import { EatFridgeItemUseCase } from '../application/eat-fridge-item.use-case';
import { ThrowFridgeItemUseCase } from '../application/throw-fridge-item.use-case';
import { FreezeFridgeItemUseCase } from '../application/freeze-fridge-item.use-case';
import { ThawFridgeItemUseCase } from '../application/thaw-fridge-item.use-case';

import { FridgePresenter } from './fridge.presenter';
import { FridgeErrorFilter } from './fridge-error.filter';
import { FridgeItemScopeGuard } from './fridge-item-scope.guard';

import { AddFridgeItemDto } from './dto/add-fridge-item.dto';
import { UpdateFridgeItemDto } from './dto/update-fridge-item.dto';
import { EatFridgeItemDto } from './dto/eat-fridge-item.dto';

/**
 * Controller del contexto `fridge`.
 *
 * Rutas bajo `/api/v1/families/:familyId/fridge` → requieren {@link FamilyScopeGuard}.
 * Rutas bajo `/api/v1/fridge-items/:itemId` → requieren {@link FridgeItemScopeGuard}.
 */
@ApiBearerAuth()
@UseFilters(FridgeErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('fridge')
export class FridgeController {
  constructor(
    private readonly addItem: AddFridgeItemUseCase,
    private readonly listItems: ListFridgeItemsUseCase,
    private readonly getItem: GetFridgeItemUseCase,
    private readonly updateItem: UpdateFridgeItemUseCase,
    private readonly deleteItem: DeleteFridgeItemUseCase,
    private readonly eatItem: EatFridgeItemUseCase,
    private readonly throwItem: ThrowFridgeItemUseCase,
    private readonly freezeItem: FreezeFridgeItemUseCase,
    private readonly thawItem: ThawFridgeItemUseCase,
  ) {}

  // ── Rutas con familyId (FamilyScopeGuard) ────────────────────────────────

  @Post('families/:familyId/fridge')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Añadir un ítem a la nevera/despensa de una familia.' })
  @ApiCreatedResponse({ description: 'Ítem creado.' })
  async addItemHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: AddFridgeItemDto,
  ): Promise<FridgeItemDto> {
    const item = await this.addItem.execute({
      familyId,
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      location: body.location,
      expiryDate: body.expiryDate,
      createdBy: user.id,
    });
    return FridgePresenter.toItemDto(item);
  }

  @Get('families/:familyId/fridge')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar los ítems de la nevera de una familia (orden: caducidad ASC, nulos al final).' })
  @ApiOkResponse({ description: 'Lista de ítems.' })
  async listItemsHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<FridgeItemDto[]> {
    const items = await this.listItems.execute({ familyId });
    return items.map(FridgePresenter.toItemDto);
  }

  // ── Rutas con itemId (FridgeItemScopeGuard) ───────────────────────────────

  @Get('fridge-items/:itemId')
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Obtener un ítem por id.' })
  @ApiOkResponse({ description: 'Ítem.' })
  async getItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<FridgeItemDto> {
    const item = await this.getItem.execute({ itemId });
    return FridgePresenter.toItemDto(item);
  }

  @Patch('fridge-items/:itemId')
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Editar un ítem de la nevera (patch parcial).' })
  @ApiOkResponse({ description: 'Ítem actualizado.' })
  async updateItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateFridgeItemDto,
  ): Promise<FridgeItemDto> {
    const item = await this.updateItem.execute({
      itemId,
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      location: body.location,
      expiryDate: body.expiryDate,
    });
    return FridgePresenter.toItemDto(item);
  }

  @Delete('fridge-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Eliminar un ítem de la nevera.' })
  @ApiNoContentResponse({ description: 'Ítem eliminado.' })
  async deleteItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.deleteItem.execute({ itemId });
  }

  // ── Acciones de dominio ───────────────────────────────────────────────────

  @Post('fridge-items/:itemId/eat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Consumir parte o todo un ítem. Si la cantidad llega a 0 se elimina.' })
  @ApiOkResponse({ description: 'Resultado del consumo (deleted: true si se eliminó).' })
  async eatItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: EatFridgeItemDto,
  ): Promise<{ deleted: boolean; itemId: string }> {
    return this.eatItem.execute({ itemId, amount: body.amount });
  }

  @Post('fridge-items/:itemId/throw')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Tirar un ítem (desperdicio). Lo elimina del inventario.' })
  @ApiNoContentResponse({ description: 'Ítem eliminado (tirado).' })
  async throwItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.throwItem.execute({ itemId });
  }

  @Post('fridge-items/:itemId/freeze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Congelar un ítem (location → FREEZER).' })
  @ApiOkResponse({ description: 'Ítem congelado.' })
  async freezeItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<FridgeItemDto> {
    const item = await this.freezeItem.execute({ itemId });
    return FridgePresenter.toItemDto(item);
  }

  @Post('fridge-items/:itemId/thaw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FridgeItemScopeGuard)
  @ApiOperation({ summary: 'Descongelar un ítem (location → FRIDGE).' })
  @ApiOkResponse({ description: 'Ítem descongelado.' })
  async thawItemHandler(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<FridgeItemDto> {
    const item = await this.thawItem.execute({ itemId });
    return FridgePresenter.toItemDto(item);
  }
}
