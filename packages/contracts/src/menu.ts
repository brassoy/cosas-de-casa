import { z } from 'zod';
import { FridgeLocationSchema } from './fridge';

export const MenuDishDtoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  usesFromFridge: z.array(z.string()),
  missingIngredients: z.array(z.string()),
});

export type MenuDishDto = z.infer<typeof MenuDishDtoSchema>;

export const MenuSuggestionDtoSchema = z.object({
  dishes: z.array(MenuDishDtoSchema),
});

export type MenuSuggestionDto = z.infer<typeof MenuSuggestionDtoSchema>;

export const SuggestMenuInputSchema = z.object({
  dishCount: z.number().int().min(1).max(14).optional(),
});

export type SuggestMenuInput = z.infer<typeof SuggestMenuInputSchema>;

export const MenuToListInputSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1).max(100),
  listId: z.string().uuid().optional(),
});

export type MenuToListInput = z.infer<typeof MenuToListInputSchema>;

export const MenuToListResultDtoSchema = z.object({
  listId: z.string().uuid(),
  listName: z.string(),
  itemsAdded: z.number().int().nonnegative(),
  ingredients: z.array(z.string()),
});

export type MenuToListResultDto = z.infer<typeof MenuToListResultDtoSchema>;

// ── Recetas persistidas ─────────────────────────────────────────────────────

/**
 * Receta/plato guardado por la familia, con su lista de ingredientes (nombres).
 */
export const RecipeDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(z.string()),
});

export type RecipeDto = z.infer<typeof RecipeDtoSchema>;

/** Payload para crear una receta. */
export const CreateRecipeInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  ingredients: z.array(z.string().trim().min(1)).min(1).max(50),
});

export type CreateRecipeInput = z.infer<typeof CreateRecipeInputSchema>;

/**
 * Cómo se ha resuelto un ingrediente contra el inventario:
 * - `normalized`: coincidencia tras normalización determinista (singular, sin ruido).
 * - `semantic`: coincidencia por similitud de embeddings (nombres parecidos).
 * - `missing`: no se ha encontrado en ninguna ubicación (falta).
 */
export const IngredientAvailabilitySchema = z.object({
  /** Nombre del ingrediente tal cual lo escribió el usuario. */
  name: z.string(),
  /** ¿Está disponible en nevera, congelador o despensa? */
  available: z.boolean(),
  /** Nombre del producto del inventario con el que cuadró (o null si falta). */
  foundAs: z.string().nullable(),
  /** Ubicación del producto encontrado (o null si falta). */
  location: FridgeLocationSchema.nullable(),
  /** Tipo de coincidencia. */
  matchType: z.enum(['normalized', 'semantic', 'missing']),
});

export type IngredientAvailability = z.infer<typeof IngredientAvailabilitySchema>;

/**
 * Resultado del chequeo de disponibilidad de una receta: estado por ingrediente
 * y la lista de los que faltan (para mandarlos a la compra).
 */
export const RecipeAvailabilityDtoSchema = z.object({
  recipeId: z.string().uuid(),
  ingredients: z.array(IngredientAvailabilitySchema),
  missing: z.array(z.string()),
});

export type RecipeAvailabilityDto = z.infer<typeof RecipeAvailabilityDtoSchema>;
