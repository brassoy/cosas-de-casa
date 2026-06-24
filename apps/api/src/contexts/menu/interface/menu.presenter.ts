import type {
  RecipeDto,
  RecipeAvailabilityDto,
} from '@cosasdecasa/contracts';
import type { Recipe } from '../domain/recipe';
import type { CheckRecipeAvailabilityResult } from '../application/check-recipe-availability.use-case';

/** Presenters: traducen entidades/resultados de dominio a DTOs del contrato. */
export const MenuPresenter = {
  toRecipeDto(recipe: Recipe): RecipeDto {
    return {
      id: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients,
    };
  },

  toAvailabilityDto(result: CheckRecipeAvailabilityResult): RecipeAvailabilityDto {
    return {
      recipeId: result.recipeId,
      ingredients: result.ingredients.map((ing) => ({
        name: ing.name,
        available: ing.available,
        foundAs: ing.foundAs,
        location: ing.location,
        matchType: ing.matchType,
      })),
      missing: result.missing,
    };
  },
};
