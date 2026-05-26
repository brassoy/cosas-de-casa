import { z } from 'zod';

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
