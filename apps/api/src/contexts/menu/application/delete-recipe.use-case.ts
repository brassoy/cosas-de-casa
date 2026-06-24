import { Inject, Injectable } from '@nestjs/common';
import {
  RECIPE_REPOSITORY,
  type RecipeRepository,
} from '../domain/ports/recipe.repository';
import { RecipeNotFoundError } from '../domain/menu.errors';

export interface DeleteRecipeCommand {
  recipeId: string;
}

/** Caso de uso: eliminar una receta. */
@Injectable()
export class DeleteRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly recipes: RecipeRepository,
  ) {}

  async execute(command: DeleteRecipeCommand): Promise<void> {
    const recipe = await this.recipes.findById(command.recipeId);
    if (!recipe) {
      throw new RecipeNotFoundError();
    }
    await this.recipes.deleteById(command.recipeId);
  }
}
