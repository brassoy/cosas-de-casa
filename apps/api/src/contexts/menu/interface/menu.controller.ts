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
import { RateLimit, RateLimitGuard } from '../../../common/rate-limit.guard';
import type {
  MenuSuggestionDto,
  MenuToListResultDto,
  RecipeDto,
  RecipeAvailabilityDto,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { SuggestMenuUseCase } from '../application/suggest-menu.use-case';
import { GenerateListFromMenuUseCase } from '../application/generate-list-from-menu.use-case';
import { CreateRecipeUseCase } from '../application/create-recipe.use-case';
import { ListRecipesUseCase } from '../application/list-recipes.use-case';
import { DeleteRecipeUseCase } from '../application/delete-recipe.use-case';
import { CheckRecipeAvailabilityUseCase } from '../application/check-recipe-availability.use-case';

import { MenuErrorFilter } from './menu-error.filter';
import { MenuPresenter } from './menu.presenter';
import { SuggestMenuDto } from './dto/suggest-menu.dto';
import { MenuToListDto } from './dto/menu-to-list.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@ApiBearerAuth()
@UseFilters(MenuErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('menu')
export class MenuController {
  constructor(
    private readonly suggestMenu: SuggestMenuUseCase,
    private readonly generateList: GenerateListFromMenuUseCase,
    private readonly createRecipe: CreateRecipeUseCase,
    private readonly listRecipes: ListRecipesUseCase,
    private readonly deleteRecipe: DeleteRecipeUseCase,
    private readonly checkAvailability: CheckRecipeAvailabilityUseCase,
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

  // ── Recetas ─────────────────────────────────────────────────────────────────

  @Post('families/:familyId/recipes')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear una receta con su lista de ingredientes.' })
  @ApiCreatedResponse({ description: 'Receta creada.' })
  async createRecipeHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateRecipeDto,
  ): Promise<RecipeDto> {
    const recipe = await this.createRecipe.execute({
      familyId,
      name: body.name,
      ingredients: body.ingredients,
      createdBy: user.id,
    });
    return MenuPresenter.toRecipeDto(recipe);
  }

  @Get('families/:familyId/recipes')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar las recetas de la familia.' })
  @ApiOkResponse({ description: 'Recetas de la familia.' })
  async listRecipesHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<RecipeDto[]> {
    const recipes = await this.listRecipes.execute({ familyId });
    return recipes.map(MenuPresenter.toRecipeDto);
  }

  @Get('families/:familyId/recipes/:recipeId/availability')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({
    summary:
      'Comprobar qué ingredientes de una receta hay en nevera/congelador/despensa.',
  })
  @ApiOkResponse({ description: 'Disponibilidad de ingredientes.' })
  async recipeAvailabilityHandler(
    @Param('familyId', ParseUUIDPipe) _familyId: string,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
  ): Promise<RecipeAvailabilityDto> {
    const result = await this.checkAvailability.execute({ recipeId });
    return MenuPresenter.toAvailabilityDto(result);
  }

  @Delete('recipes/:recipeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una receta.' })
  @ApiNoContentResponse({ description: 'Receta eliminada.' })
  async deleteRecipeHandler(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
  ): Promise<void> {
    await this.deleteRecipe.execute({ recipeId });
  }
}
