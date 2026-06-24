import type { Recipe } from '../recipe';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');

/** Puerto de persistencia de recetas. */
export interface RecipeRepository {
  /** Persiste una receta nueva. */
  create(recipe: Recipe): Promise<void>;

  /** Devuelve todas las recetas de una familia, las más recientes primero. */
  findByFamily(familyId: string): Promise<Recipe[]>;

  /** Busca una receta por su id. */
  findById(recipeId: string): Promise<Recipe | null>;

  /** Elimina una receta. */
  deleteById(recipeId: string): Promise<void>;
}
