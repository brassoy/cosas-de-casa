import { desc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { recipes } from '../../../db/schema';
import type { Recipe } from '../domain/recipe';
import type { RecipeRepository } from '../domain/ports/recipe.repository';
import { RecipeMapper } from './recipe.mapper';

/** Adaptador Drizzle de {@link RecipeRepository}. Respeta RLS (rol normal). */
export class DrizzleRecipeRepository implements RecipeRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(recipe: Recipe): Promise<void> {
    await this.db.insert(recipes).values({
      id: recipe.id,
      familyId: recipe.familyId,
      name: recipe.name,
      ingredients: recipe.ingredients,
      createdBy: recipe.createdBy ?? undefined,
      createdAt: recipe.createdAt,
    });
  }

  async findByFamily(familyId: string): Promise<Recipe[]> {
    const rows = await this.db
      .select()
      .from(recipes)
      .where(eq(recipes.familyId, familyId))
      .orderBy(desc(recipes.createdAt));

    return rows.map(RecipeMapper.toRecipe);
  }

  async findById(recipeId: string): Promise<Recipe | null> {
    const rows = await this.db
      .select()
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return RecipeMapper.toRecipe(row);
  }

  async deleteById(recipeId: string): Promise<void> {
    await this.db.delete(recipes).where(eq(recipes.id, recipeId));
  }
}
