import {
  RecipeNameEmptyError,
  RecipeNoIngredientsError,
} from './menu.errors';

export interface RecipeProps {
  id: string;
  familyId: string;
  name: string;
  /** Nombres de los ingredientes (texto libre). */
  ingredients: string[];
  createdBy: string | null;
  createdAt: Date;
}

export interface NewRecipeParams {
  id: string;
  familyId: string;
  name: string;
  ingredients: string[];
  createdBy: string;
  now: Date;
}

/**
 * Entidad Recipe (receta/plato guardado por la familia).
 *
 * Invariantes:
 * - El nombre no puede estar vacío.
 * - Debe tener al menos un ingrediente no vacío.
 *
 * Los ingredientes se guardan como nombres tras recortar espacios y descartar
 * las cadenas vacías. El cruce con el inventario (nevera/congelador/despensa)
 * lo hace el caso de uso de disponibilidad, no la entidad.
 */
export class Recipe {
  readonly id: string;
  readonly familyId: string;
  readonly name: string;
  readonly ingredients: string[];
  readonly createdBy: string | null;
  readonly createdAt: Date;

  constructor(props: RecipeProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this.name = props.name;
    this.ingredients = props.ingredients;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  /** Crea una receta nueva validando las invariantes. */
  static create(params: NewRecipeParams): Recipe {
    const name = params.name.trim();
    if (!name) {
      throw new RecipeNameEmptyError();
    }

    const ingredients = params.ingredients
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    if (ingredients.length === 0) {
      throw new RecipeNoIngredientsError();
    }

    return new Recipe({
      id: params.id,
      familyId: params.familyId,
      name,
      ingredients,
      createdBy: params.createdBy,
      createdAt: params.now,
    });
  }
}
