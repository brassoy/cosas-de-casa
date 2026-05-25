import {
  CannotDeleteMainListError,
  ItemNameEmptyError,
  MainListAlreadyExistsError,
} from './shopping.errors';

export type ListType = 'MAIN' | 'CUSTOM';

export interface ShoppingListProps {
  id: string;
  familyId: string;
  name: string;
  type: ListType;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewShoppingListParams {
  id: string;
  familyId: string;
  name: string;
  type: ListType;
  createdBy: string | null;
  now: Date;
}

export interface ShoppingItemProps {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  description: string | null;
  purchaseLink: string | null;
  checked: boolean;
  position: number | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewShoppingItemParams {
  id: string;
  listId: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  description?: string | null;
  purchaseLink?: string | null;
  position?: number | null;
  createdBy: string | null;
  now: Date;
}

export interface ItemCommentProps {
  id: string;
  itemId: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
}

export interface NewItemCommentParams {
  id: string;
  itemId: string;
  authorId: string | null;
  body: string;
  now: Date;
}

/**
 * Aggregate ShoppingList.
 *
 * Invariantes que protege:
 * - Solo puede existir una lista MAIN por familia.
 * - La lista MAIN no puede borrarse.
 * - El nombre de un ítem no puede estar vacío.
 */
export class ShoppingList {
  readonly id: string;
  readonly familyId: string;
  private _name: string;
  readonly type: ListType;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ShoppingListProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._name = props.name;
    this.type = props.type;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get name(): string {
    return this._name;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isMain(): boolean {
    return this.type === 'MAIN';
  }

  /** Crea una lista nueva. Para listas MAIN, usa {@link ShoppingList.createMain}. */
  static create(params: NewShoppingListParams): ShoppingList {
    return new ShoppingList({
      id: params.id,
      familyId: params.familyId,
      name: params.name,
      type: params.type,
      createdBy: params.createdBy,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /**
   * Fábrica para crear la lista MAIN de una familia.
   * Lanza {@link MainListAlreadyExistsError} si ya existe una lista MAIN en la familia
   * (verificación a nivel de dominio; la BD tiene un índice parcial como respaldo).
   */
  static createMain(
    params: Omit<NewShoppingListParams, 'type' | 'name'>,
    existingMainList: ShoppingList | null,
  ): ShoppingList {
    if (existingMainList !== null) {
      throw new MainListAlreadyExistsError();
    }
    return ShoppingList.create({ ...params, type: 'MAIN', name: 'Lista principal' });
  }

  /**
   * Verifica que esta lista se pueda borrar.
   * La lista MAIN no se puede eliminar nunca.
   */
  assertDeletable(): void {
    if (this.isMain) {
      throw new CannotDeleteMainListError();
    }
  }
}

/**
 * Entidad ShoppingItem (vive bajo ShoppingList pero tiene su propio ciclo de vida).
 */
export class ShoppingItem {
  readonly id: string;
  readonly listId: string;
  private _name: string;
  private _quantity: number | null;
  private _unit: string | null;
  private _description: string | null;
  private _purchaseLink: string | null;
  private _checked: boolean;
  private _position: number | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ShoppingItemProps) {
    this.id = props.id;
    this.listId = props.listId;
    this._name = props.name;
    this._quantity = props.quantity;
    this._unit = props.unit;
    this._description = props.description;
    this._purchaseLink = props.purchaseLink;
    this._checked = props.checked;
    this._position = props.position;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get name(): string { return this._name; }
  get quantity(): number | null { return this._quantity; }
  get unit(): string | null { return this._unit; }
  get description(): string | null { return this._description; }
  get purchaseLink(): string | null { return this._purchaseLink; }
  get checked(): boolean { return this._checked; }
  get position(): number | null { return this._position; }
  get updatedAt(): Date { return this._updatedAt; }

  static create(params: NewShoppingItemParams): ShoppingItem {
    const trimmed = params.name.trim();
    if (!trimmed) {
      throw new ItemNameEmptyError();
    }
    return new ShoppingItem({
      id: params.id,
      listId: params.listId,
      name: trimmed,
      quantity: params.quantity ?? null,
      unit: params.unit ?? null,
      description: params.description ?? null,
      purchaseLink: params.purchaseLink ?? null,
      checked: false,
      position: params.position ?? null,
      createdBy: params.createdBy,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /** Invierte el estado de marcado. */
  toggleChecked(now: Date): void {
    this._checked = !this._checked;
    this._updatedAt = now;
  }

  /** Actualiza campos editables. Solo modifica los campos presentes (patch parcial). */
  update(
    patch: {
      name?: string;
      quantity?: number | null;
      unit?: string | null;
      description?: string | null;
      purchaseLink?: string | null;
      position?: number | null;
    },
    now: Date,
  ): void {
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) {
        throw new ItemNameEmptyError();
      }
      this._name = trimmed;
    }
    if (patch.quantity !== undefined) { this._quantity = patch.quantity; }
    if (patch.unit !== undefined) { this._unit = patch.unit; }
    if (patch.description !== undefined) { this._description = patch.description; }
    if (patch.purchaseLink !== undefined) { this._purchaseLink = patch.purchaseLink; }
    if (patch.position !== undefined) { this._position = patch.position; }
    this._updatedAt = now;
  }
}

/**
 * Entidad ItemComment. Inmutable tras la creación.
 */
export class ItemComment {
  readonly id: string;
  readonly itemId: string;
  readonly authorId: string | null;
  readonly body: string;
  readonly createdAt: Date;

  constructor(props: ItemCommentProps) {
    this.id = props.id;
    this.itemId = props.itemId;
    this.authorId = props.authorId;
    this.body = props.body;
    this.createdAt = props.createdAt;
  }

  static create(params: NewItemCommentParams): ItemComment {
    return new ItemComment({
      id: params.id,
      itemId: params.itemId,
      authorId: params.authorId,
      body: params.body,
      createdAt: params.now,
    });
  }
}
