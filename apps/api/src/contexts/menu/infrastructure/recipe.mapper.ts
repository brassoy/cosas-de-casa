import type { RecipeRow } from '../../../db/schema';
import { Recipe } from '../domain/recipe';

/** Traduce filas de BD a entidades de dominio. */
export const RecipeMapper = {
  toRecipe(row: RecipeRow): Recipe {
    return new Recipe({
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      ingredients: row.ingredients,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
    });
  },
};
