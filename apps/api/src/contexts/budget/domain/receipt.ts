import { ReceiptInvalidTotalError, ReceiptLineTotalNegativeError } from './budget.errors';

export type SpendCategory = 'groceries' | 'household' | 'dining_out' | 'leisure' | 'other';
export type ReceiptStatus = 'draft' | 'confirmed';

export interface ReceiptLineProps {
  id: string;
  receiptId: string;
  description: string;
  quantity: string | null;
  unitPrice: string | null;
  lineTotal: string;
  category: SpendCategory;
  createdAt: Date;
}

export interface ReceiptProps {
  id: string;
  familyId: string;
  merchant: string | null;
  purchasedAt: string; // YYYY-MM-DD
  total: string; // numeric como string (p.ej. "12.50")
  currency: string;
  status: ReceiptStatus;
  imagePath: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines: ReceiptLine[];
}

export interface NewReceiptLineParams {
  id: string;
  receiptId: string;
  description: string;
  quantity?: string | null;
  unitPrice?: string | null;
  lineTotal: string;
  category?: SpendCategory;
  now: Date;
}

export interface NewReceiptParams {
  id: string;
  familyId: string;
  merchant?: string | null;
  purchasedAt: string;
  total: string;
  currency?: string;
  imagePath?: string | null;
  createdBy: string;
  now: Date;
  lines?: NewReceiptLineParams[];
}

export interface UpdateReceiptPatch {
  merchant?: string | null;
  purchasedAt?: string;
  total?: string;
  currency?: string;
  status?: ReceiptStatus;
  imagePath?: string | null;
}

/**
 * Línea de ticket — value object inmutable.
 */
export class ReceiptLine {
  readonly id: string;
  readonly receiptId: string;
  readonly description: string;
  readonly quantity: string | null;
  readonly unitPrice: string | null;
  readonly lineTotal: string;
  readonly category: SpendCategory;
  readonly createdAt: Date;

  constructor(props: ReceiptLineProps) {
    this.id = props.id;
    this.receiptId = props.receiptId;
    this.description = props.description;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.lineTotal = props.lineTotal;
    this.category = props.category;
    this.createdAt = props.createdAt;
  }

  static create(params: NewReceiptLineParams): ReceiptLine {
    const total = parseFloat(params.lineTotal);
    if (isNaN(total) || total < 0) {
      throw new ReceiptLineTotalNegativeError();
    }
    return new ReceiptLine({
      id: params.id,
      receiptId: params.receiptId,
      description: params.description.trim(),
      quantity: params.quantity ?? null,
      unitPrice: params.unitPrice ?? null,
      lineTotal: params.lineTotal,
      category: params.category ?? 'other',
      createdAt: params.now,
    });
  }
}

/**
 * Agregado Receipt.
 *
 * Invariantes:
 * - El total no puede ser negativo.
 * - Cada línea tiene lineTotal >= 0.
 */
export class Receipt {
  readonly id: string;
  readonly familyId: string;
  private _merchant: string | null;
  private _purchasedAt: string;
  private _total: string;
  private _currency: string;
  private _status: ReceiptStatus;
  private _imagePath: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private _lines: ReceiptLine[];

  constructor(props: ReceiptProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this._merchant = props.merchant;
    this._purchasedAt = props.purchasedAt;
    this._total = props.total;
    this._currency = props.currency;
    this._status = props.status;
    this._imagePath = props.imagePath;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._lines = [...props.lines];
  }

  get merchant(): string | null { return this._merchant; }
  get purchasedAt(): string { return this._purchasedAt; }
  get total(): string { return this._total; }
  get currency(): string { return this._currency; }
  get status(): ReceiptStatus { return this._status; }
  get imagePath(): string | null { return this._imagePath; }
  get updatedAt(): Date { return this._updatedAt; }
  get lines(): ReceiptLine[] { return [...this._lines]; }

  static create(params: NewReceiptParams): Receipt {
    const total = parseFloat(params.total);
    if (isNaN(total) || total < 0) {
      throw new ReceiptInvalidTotalError();
    }

    const now = params.now;
    const lines = (params.lines ?? []).map((l) => ReceiptLine.create(l));

    return new Receipt({
      id: params.id,
      familyId: params.familyId,
      merchant: params.merchant ?? null,
      purchasedAt: params.purchasedAt,
      total: params.total,
      currency: params.currency ?? 'EUR',
      status: 'confirmed',
      imagePath: params.imagePath ?? null,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      lines,
    });
  }

  update(patch: UpdateReceiptPatch, now: Date): void {
    if (patch.merchant !== undefined) this._merchant = patch.merchant;
    if (patch.purchasedAt !== undefined) this._purchasedAt = patch.purchasedAt;
    if (patch.total !== undefined) {
      const t = parseFloat(patch.total);
      if (isNaN(t) || t < 0) throw new ReceiptInvalidTotalError();
      this._total = patch.total;
    }
    if (patch.currency !== undefined) this._currency = patch.currency;
    if (patch.status !== undefined) this._status = patch.status;
    if (patch.imagePath !== undefined) this._imagePath = patch.imagePath;
    this._updatedAt = now;
  }

  replaceLines(lines: ReceiptLine[], now: Date): void {
    this._lines = [...lines];
    this._updatedAt = now;
  }
}
