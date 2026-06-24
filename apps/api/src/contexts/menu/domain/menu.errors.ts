/** Errores de dominio del contexto `menu`. */
export abstract class MenuDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La IA no está disponible. */
export class MenuAiUnavailableError extends MenuDomainError {
  readonly code = 'AI_UNAVAILABLE';
  constructor(reason?: string) {
    super(reason ?? 'El servicio de IA no está disponible en este momento. Inténtalo de nuevo más tarde.');
  }
}

/** La lista de la compra no existe. */
export class MenuListNotFoundError extends MenuDomainError {
  readonly code = 'MENU_LIST_NOT_FOUND';
  constructor() {
    super('La lista de la compra no existe.');
  }
}

/** La receta no existe. */
export class RecipeNotFoundError extends MenuDomainError {
  readonly code = 'RECIPE_NOT_FOUND';
  constructor() {
    super('La receta no existe.');
  }
}

/** El nombre de la receta no puede estar vacío. */
export class RecipeNameEmptyError extends MenuDomainError {
  readonly code = 'RECIPE_NAME_EMPTY';
  constructor() {
    super('El nombre de la receta no puede estar vacío.');
  }
}

/** Una receta necesita al menos un ingrediente. */
export class RecipeNoIngredientsError extends MenuDomainError {
  readonly code = 'RECIPE_NO_INGREDIENTS';
  constructor() {
    super('La receta necesita al menos un ingrediente.');
  }
}
