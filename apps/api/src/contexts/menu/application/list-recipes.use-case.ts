import { Inject, Injectable } from '@nestjs/common';
import {
  RECIPE_REPOSITORY,
  type RecipeRepository,
} from '../domain/ports/recipe.repository';
import type { Recipe } from '../domain/recipe';

export interface ListRecipesCommand {
  familyId: string;
}

/** Caso de uso: listar las recetas de una familia. */
@Injectable()
export class ListRecipesUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly recipes: RecipeRepository,
  ) {}

  async execute(command: ListRecipesCommand): Promise<Recipe[]> {
    return this.recipes.findByFamily(command.familyId);
  }
}
