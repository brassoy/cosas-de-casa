import {
  Body,
  Controller,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RateLimit, RateLimitGuard } from '../../../common/rate-limit.guard';
import type { MenuSuggestionDto, MenuToListResultDto } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { SuggestMenuUseCase } from '../application/suggest-menu.use-case';
import { GenerateListFromMenuUseCase } from '../application/generate-list-from-menu.use-case';

import { MenuErrorFilter } from './menu-error.filter';
import { SuggestMenuDto } from './dto/suggest-menu.dto';
import { MenuToListDto } from './dto/menu-to-list.dto';

@ApiBearerAuth()
@UseFilters(MenuErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('menu')
export class MenuController {
  constructor(
    private readonly suggestMenu: SuggestMenuUseCase,
    private readonly generateList: GenerateListFromMenuUseCase,
  ) {}

  @Post('families/:familyId/menu/suggest')
  @UseGuards(FamilyScopeGuard, RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttl: 60_000 }) // 5 req/min — costoso
  @ApiOperation({ summary: 'Sugerir menú semanal a partir del contenido de la nevera (IA).' })
  @ApiOkResponse({ description: 'Sugerencias de menú.' })
  async suggestMenuHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: SuggestMenuDto,
  ): Promise<MenuSuggestionDto> {
    const result = await this.suggestMenu.execute({
      familyId,
      dishCount: body.dishCount,
    });
    return { dishes: result.dishes };
  }

  @Post('families/:familyId/menu/to-list')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Añadir ingredientes del menú a la lista de la compra.' })
  @ApiCreatedResponse({ description: 'Ingredientes añadidos a la lista.' })
  async menuToListHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: MenuToListDto,
  ): Promise<MenuToListResultDto> {
    return this.generateList.execute({
      familyId,
      actingUserId: user.id,
      ingredients: body.ingredients,
      listId: body.listId,
    });
  }
}
