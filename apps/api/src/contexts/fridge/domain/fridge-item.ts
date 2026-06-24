import {
  FridgeItemNameEmptyError,
  FridgeItemInsufficientQuantityError,
  FridgeItemInvalidQuantityError,
} from './fridge.errors';

export type FridgeLocation = 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'DISCARDED';

export interface FridgeItemProps {
  id: string;
  familyId: string;
  name: string;
  /** Cantidad como cadena numérica (p. ej. "2.500"). Null = sin cantidad. */
  quantity: string | null;
  unit: string | null;
  location: FridgeLocation;
  /** Fecha de caducidad en formato YYYY-MM-DD. Null si no se especificó. */
  expiryDate: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewFridgeItemParams {
  id: string;
  familyId: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  location?: FridgeLocation;
  expiryDate?: string | null;
  createdBy: string;
  now: Date;
}

export interface UpdateFridgeItemPatch {
  name?: string;
  quantity?: string | null;
  unit?: string | null;
  location?: FridgeLocation;
  expiryDate?: string | null;
}

/**
 * Entidad FridgeItem.
 *
 * Invariantes:
 * - El nombre no puede estar vacío.
 * - La cantidad, si se indica, debe ser un número positivo.
 *
 * Acciones de dominio:
 * - eat(amount): decrementa la cantidad; si llega a 0 o la cantidad es null → devuelve true (eliminar).
 * - throw_(): mueve el ítem a DISCARDED (registro de comida tirada).
 * - freeze(): mueve el ítem al congelador.
 * - thaw(): mueve el ítem de vuelta a la nevera.
 * - update(patch): actualiza campos editables.
 */
export class FridgeItem {
  readonly id: string;
  readonly familyId: string;
  private _name: string;
  private _quantity: string | null;
  private _unit: string | null;
  private _location: FridgeLocation;
  private _expiryDate: string | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: FridgeItemProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._name = props.name;
    this._quantity = props.quantity;
    this._unit = props.unit;
    this._location = props.location;
    this._expiryDate = props.expiryDate;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get name(): string { return this._name; }
  get quantity(): string | null { return this._quantity; }
  get unit(): string | null { return this._unit; }
  get location(): FridgeLocation { return this._location; }
  get expiryDate(): string | null { return this._expiryDate; }
  get updatedAt(): Date { return this._updatedAt; }

  /** Crea un ítem nuevo. */
  static create(params: NewFridgeItemParams): FridgeItem {
    const trimmed = params.name.trim();
    if (!trimmed) {
      throw new FridgeItemNameEmptyError();
    }

    if (params.quantity !== undefined && params.quantity !== null) {
      FridgeItem.validateQuantity(params.quantity);
    }

    return new FridgeItem({
      id: params.id,
      familyId: params.familyId,
      name: trimmed,
      quantity: params.quantity ?? null,
      unit: params.unit ?? null,
      location: params.location ?? 'FRIDGE',
      expiryDate: params.expiryDate ?? null,
      createdBy: params.createdBy,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /**
   * Consume parte del ítem.
   *
   * - Si el ítem no tiene cantidad registrada → se elimina (return true).
   * - Si `amount` no se indica → se elimina directamente (return true).
   * - Si la cantidad resultante es ≤ 0 → se elimina (return true).
   * - En caso contrario decrementas y devuelve false.
   *
   * @throws FridgeItemInvalidQuantityError si amount no es positivo.
   * @throws FridgeItemInsufficientQuantityError si amount > cantidad actual.
   * @returns true si el ítem debe eliminarse, false si sigue existiendo.
   */
  eat(amount: string | undefined, now: Date): boolean {
    // Sin cantidad registrada o sin amount → eliminar directamente
    if (this._quantity === null || amount === undefined) {
      return true;
    }

    FridgeItem.validateQuantity(amount);

    const current = parseFloat(this._quantity);
    const consumed = parseFloat(amount);

    if (consumed > current) {
      throw new FridgeItemInsufficientQuantityError(this._quantity, amount);
    }

    const remaining = current - consumed;
    if (remaining <= 0) {
      return true;
    }

    this._quantity = remaining.toFixed(3).replace(/\.?0+$/, '') || '0';
    this._updatedAt = now;
    return false;
  }

  /**
   * Tira el ítem (desperdicio): lo mueve a la ubicación DISCARDED en vez de
   * eliminarlo, dejando un registro de la comida tirada. Espejo de freeze()/thaw().
   */
  throw_(now: Date): void {
    this._location = 'DISCARDED';
    this._updatedAt = now;
  }

  /** Mueve el ítem al congelador. */
  freeze(now: Date): void {
    this._location = 'FREEZER';
    this._updatedAt = now;
  }

  /** Mueve el ítem de vuelta a la nevera. */
  thaw(now: Date): void {
    this._location = 'FRIDGE';
    this._updatedAt = now;
  }

  /** Actualiza campos editables (patch parcial). */
  update(patch: UpdateFridgeItemPatch, now: Date): void {
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) throw new FridgeItemNameEmptyError();
      this._name = trimmed;
    }
    if (patch.quantity !== undefined) {
      if (patch.quantity !== null) {
        FridgeItem.validateQuantity(patch.quantity);
      }
      this._quantity = patch.quantity;
    }
    if (patch.unit !== undefined) {
      this._unit = patch.unit;
    }
    if (patch.location !== undefined) {
      this._location = patch.location;
    }
    if (patch.expiryDate !== undefined) {
      this._expiryDate = patch.expiryDate;
    }
    this._updatedAt = now;
  }

  private static validateQuantity(value: string): void {
    const n = parseFloat(value);
    if (isNaN(n) || n <= 0) {
      throw new FridgeItemInvalidQuantityError();
    }
  }
}
