/**
 * Tests unitarios de las recetas del contexto `menu`.
 *
 * Cobertura:
 *  ✓ Recipe (dominio): recorta nombre, descarta ingredientes vacíos
 *  ✓ Recipe (dominio): nombre vacío → RecipeNameEmptyError
 *  ✓ Recipe (dominio): sin ingredientes → RecipeNoIngredientsError
 *  ✓ CreateRecipeUseCase: crea y persiste la receta
 *  ✓ ListRecipesUseCase: devuelve las recetas de la familia
 *  ✓ DeleteRecipeUseCase: elimina; receta inexistente → RecipeNotFoundError
 *  ✓ CheckRecipeAvailabilityUseCase: "patata cocida" cuadra con "patatas" por normalización
 *  ✓ CheckRecipeAvailabilityUseCase: "huevos" cuadra con "huevo" por normalización
 *  ✓ CheckRecipeAvailabilityUseCase: excluye los ítems DISCARDED
 *  ✓ CheckRecipeAvailabilityUseCase: un ingrediente inexistente sale missing
 *  ✓ CheckRecipeAvailabilityUseCase: similitud semántica cuando no hay match exacto
 *  ✓ CheckRecipeAvailabilityUseCase: sin embeddings (null) cae solo a determinista
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type { FridgeItemRepository } from '../../fridge/domain/ports/fridge-item.repository';
import type { EmbeddingPort } from '../../ai/domain/ports/embedding.port';
import { FridgeItem } from '../../fridge/domain/fridge-item';
import type { FridgeLocation } from '../../fridge/domain/fridge-item';
import { Recipe } from '../domain/recipe';
import {
  RecipeNameEmptyError,
  RecipeNoIngredientsError,
  RecipeNotFoundError,
} from '../domain/menu.errors';
import type { RecipeRepository } from '../domain/ports/recipe.repository';
import type { MenuClock } from './ports/clock';
import type { MenuIdGenerator } from './ports/id-generator';
import { CreateRecipeUseCase } from './create-recipe.use-case';
import { ListRecipesUseCase } from './list-recipes.use-case';
import { DeleteRecipeUseCase } from './delete-recipe.use-case';
import { CheckRecipeAvailabilityUseCase } from './check-recipe-availability.use-case';

// ── Fakes ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-26T10:00:00Z');
const FAMILY_ID = 'fam-1';

let idCounter = 0;
const fakeClock: MenuClock = { now: () => NOW };
const fakeIds: MenuIdGenerator = { generate: () => `recipe-${++idCounter}` };

let recipeStore: Recipe[] = [];

const fakeRecipeRepo: RecipeRepository = {
  async create(recipe) {
    recipeStore.push(recipe);
  },
  async findByFamily(familyId) {
    return recipeStore.filter((r) => r.familyId === familyId);
  },
  async findById(id) {
    return recipeStore.find((r) => r.id === id) ?? null;
  },
  async deleteById(id) {
    recipeStore = recipeStore.filter((r) => r.id !== id);
  },
};

function makeFridgeItem(name: string, location: FridgeLocation = 'FRIDGE'): FridgeItem {
  return new FridgeItem({
    id: `fridge-${name}-${location}`,
    familyId: FAMILY_ID,
    name,
    quantity: null,
    unit: null,
    location,
    expiryDate: null,
    createdBy: 'user-1',
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function fridgeRepoWith(items: FridgeItem[]): FridgeItemRepository {
  return {
    async create() {},
    async findById() {
      return null;
    },
    async findByFamily(familyId) {
      return items.filter((i) => i.familyId === familyId);
    },
    async findExpiringSoon() {
      return [];
    },
    async update() {},
    async deleteById() {},
  };
}

/** Embedding determinista por hash del texto (mismo enfoque que app-factory). */
const hashEmbedding: EmbeddingPort = {
  async embed(text: string) {
    return Array.from({ length: 64 }, (_, i) => {
      const charCode = text.charCodeAt(i % text.length) || 1;
      return Math.sin(i + charCode) * 0.5 + 0.5;
    });
  },
};

/** Embedding que devuelve siempre el mismo vector (todo cuadra por semántica). */
const alwaysSameEmbedding: EmbeddingPort = {
  async embed() {
    return Array.from({ length: 64 }, () => 1);
  },
};

/** Embedding no disponible (modelo no descargado): degradación. */
const nullEmbedding: EmbeddingPort = {
  async embed() {
    return null;
  },
};

async function seedRecipe(name: string, ingredients: string[]): Promise<Recipe> {
  const create = new CreateRecipeUseCase(fakeRecipeRepo, fakeClock, fakeIds);
  return create.execute({
    familyId: FAMILY_ID,
    name,
    ingredients,
    createdBy: 'user-1',
  });
}

beforeEach(() => {
  recipeStore = [];
  idCounter = 0;
});

// ─────────────────────────────────────────────────────────────────────────────
// Dominio: Recipe
// ─────────────────────────────────────────────────────────────────────────────

describe('Recipe (dominio)', () => {
  it('recorta el nombre y descarta ingredientes vacíos', () => {
    const recipe = Recipe.create({
      id: 'r-1',
      familyId: FAMILY_ID,
      name: '  Ensaladilla pablos  ',
      ingredients: ['patata cocida', '  ', 'atún', ''],
      createdBy: 'user-1',
      now: NOW,
    });
    expect(recipe.name).toBe('Ensaladilla pablos');
    expect(recipe.ingredients).toEqual(['patata cocida', 'atún']);
  });

  it('lanza RecipeNameEmptyError con nombre vacío', () => {
    expect(() =>
      Recipe.create({
        id: 'r-1',
        familyId: FAMILY_ID,
        name: '   ',
        ingredients: ['atún'],
        createdBy: 'user-1',
        now: NOW,
      }),
    ).toThrow(RecipeNameEmptyError);
  });

  it('lanza RecipeNoIngredientsError sin ingredientes válidos', () => {
    expect(() =>
      Recipe.create({
        id: 'r-1',
        familyId: FAMILY_ID,
        name: 'Plato vacío',
        ingredients: ['  ', ''],
        createdBy: 'user-1',
        now: NOW,
      }),
    ).toThrow(RecipeNoIngredientsError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CRUD de recetas
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateRecipeUseCase', () => {
  it('crea y persiste la receta con id e instante del reloj', async () => {
    const recipe = await seedRecipe('Tortilla', ['huevo', 'patata']);
    expect(recipe.id).toBe('recipe-1');
    expect(recipe.createdAt).toBe(NOW);
    expect(recipeStore).toHaveLength(1);
  });
});

describe('ListRecipesUseCase', () => {
  it('devuelve las recetas de la familia', async () => {
    await seedRecipe('Tortilla', ['huevo']);
    await seedRecipe('Gazpacho', ['tomate']);
    const list = new ListRecipesUseCase(fakeRecipeRepo);
    const recipes = await list.execute({ familyId: FAMILY_ID });
    expect(recipes.map((r) => r.name)).toEqual(['Tortilla', 'Gazpacho']);
  });
});

describe('DeleteRecipeUseCase', () => {
  it('elimina la receta existente', async () => {
    const recipe = await seedRecipe('Tortilla', ['huevo']);
    const del = new DeleteRecipeUseCase(fakeRecipeRepo);
    await del.execute({ recipeId: recipe.id });
    expect(recipeStore).toHaveLength(0);
  });

  it('lanza RecipeNotFoundError si la receta no existe', async () => {
    const del = new DeleteRecipeUseCase(fakeRecipeRepo);
    await expect(del.execute({ recipeId: 'no-existe' })).rejects.toThrow(
      RecipeNotFoundError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CheckRecipeAvailabilityUseCase (el corazón)
// ─────────────────────────────────────────────────────────────────────────────

describe('CheckRecipeAvailabilityUseCase', () => {
  it('"patata cocida" cuadra con un ítem "patatas" por normalización', async () => {
    const recipe = await seedRecipe('Ensaladilla', ['patata cocida']);
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([makeFridgeItem('patatas')]),
      hashEmbedding,
    );

    const result = await useCase.execute({ recipeId: recipe.id });
    const ingredient = result.ingredients[0]!;

    expect(ingredient.available).toBe(true);
    expect(ingredient.matchType).toBe('normalized');
    expect(ingredient.foundAs).toBe('patatas');
    expect(ingredient.location).toBe('FRIDGE');
    expect(result.missing).toEqual([]);
  });

  it('"huevos" cuadra con un ítem "huevo" por normalización (plural irregular)', async () => {
    const recipe = await seedRecipe('Tortilla', ['huevos']);
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([makeFridgeItem('huevo')]),
      hashEmbedding,
    );

    const result = await useCase.execute({ recipeId: recipe.id });
    expect(result.ingredients[0]!.matchType).toBe('normalized');
    expect(result.ingredients[0]!.available).toBe(true);
  });

  it('encuentra ingredientes en congelador y despensa, no en DISCARDED', async () => {
    const recipe = await seedRecipe('Plato', ['guisantes', 'arroz', 'pan']);
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([
        makeFridgeItem('guisantes', 'FREEZER'),
        makeFridgeItem('arroz', 'PANTRY'),
        makeFridgeItem('pan', 'DISCARDED'), // tirado → no cuenta
      ]),
      hashEmbedding,
    );

    const result = await useCase.execute({ recipeId: recipe.id });
    const byName = Object.fromEntries(
      result.ingredients.map((i) => [i.name, i]),
    );

    expect(byName['guisantes']!.available).toBe(true);
    expect(byName['guisantes']!.location).toBe('FREEZER');
    expect(byName['arroz']!.available).toBe(true);
    expect(byName['arroz']!.location).toBe('PANTRY');
    // El pan tirado no debe encontrarse
    expect(byName['pan']!.available).toBe(false);
    expect(byName['pan']!.matchType).toBe('missing');
    expect(result.missing).toContain('pan');
  });

  it('un ingrediente inexistente sale como missing', async () => {
    const recipe = await seedRecipe('Plato', ['caviar iraní']);
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([makeFridgeItem('patatas')]),
      hashEmbedding,
    );

    const result = await useCase.execute({ recipeId: recipe.id });
    const ingredient = result.ingredients[0]!;

    expect(ingredient.available).toBe(false);
    expect(ingredient.matchType).toBe('missing');
    expect(ingredient.foundAs).toBeNull();
    expect(ingredient.location).toBeNull();
    expect(result.missing).toEqual(['caviar iraní']);
  });

  it('cae a similitud semántica cuando no hay coincidencia normalizada', async () => {
    const recipe = await seedRecipe('Plato', ['bonito del norte']);
    // El embedding constante hace que cualquier par tenga coseno 1 → match semántico.
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([makeFridgeItem('atún claro')]),
      alwaysSameEmbedding,
    );

    const result = await useCase.execute({ recipeId: recipe.id });
    const ingredient = result.ingredients[0]!;

    expect(ingredient.available).toBe(true);
    expect(ingredient.matchType).toBe('semantic');
    expect(ingredient.foundAs).toBe('atún claro');
  });

  it('sin embeddings disponibles (null) usa solo el nivel determinista', async () => {
    const recipe = await seedRecipe('Plato', ['bonito del norte']);
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([makeFridgeItem('atún claro')]),
      nullEmbedding,
    );

    const result = await useCase.execute({ recipeId: recipe.id });
    // Sin semántico y sin match normalizado → missing
    expect(result.ingredients[0]!.matchType).toBe('missing');
    expect(result.ingredients[0]!.available).toBe(false);
  });

  it('lanza RecipeNotFoundError si la receta no existe', async () => {
    const useCase = new CheckRecipeAvailabilityUseCase(
      fakeRecipeRepo,
      fridgeRepoWith([]),
      hashEmbedding,
    );
    await expect(useCase.execute({ recipeId: 'no-existe' })).rejects.toThrow(
      RecipeNotFoundError,
    );
  });
});
