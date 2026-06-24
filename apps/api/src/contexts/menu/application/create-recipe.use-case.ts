import { Inject, Injectable } from '@nestjs/common';
import {
  RECIPE_REPOSITORY,
  type RecipeRepository,
} from '../domain/ports/recipe.repository';
import { MENU_CLOCK, type MenuClock } from './ports/clock';
import { MENU_ID_GENERATOR, type MenuIdGenerator } from './ports/id-generator';
import { Recipe } from '../domain/recipe';

export interface CreateRecipeCommand {
  familyId: string;
  name: string;
  ingredients: string[];
  createdBy: string;
}

/** Caso de uso: crear y persistir una receta de la familia. */
@Injectable()
export class CreateRecipeUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly recipes: RecipeRepository,
    @Inject(MENU_CLOCK) private readonly clock: MenuClock,
    @Inject(MENU_ID_GENERATOR) private readonly ids: MenuIdGenerator,
  ) {}

  async execute(command: CreateRecipeCommand): Promise<Recipe> {
    const recipe = Recipe.create({
      id: this.ids.generate(),
      familyId: command.familyId,
      name: command.name,
      ingredients: command.ingredients,
      createdBy: command.createdBy,
      now: this.clock.now(),
    });

    await this.recipes.create(recipe);
    return recipe;
  }
}
