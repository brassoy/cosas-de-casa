/**
 * Errores de dominio del contexto `budget`.
 *
 * Todos son TS puro: NO conocen HTTP ni Nest. La capa de interfaz los traduce
 * a códigos de estado. Cada uno lleva un `code` estable para el cliente y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class BudgetDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** El ticket solicitado no existe. */
export class ReceiptNotFoundError extends BudgetDomainError {
  readonly code = 'RECEIPT_NOT_FOUND';
  constructor() {
    super('El ticket no existe.');
  }
}

/** El usuario no pertenece a la familia del ticket. */
export class NotBudgetFamilyMemberError extends BudgetDomainError {
  readonly code = 'NOT_BUDGET_FAMILY_MEMBER';
  constructor() {
    super('No perteneces a la familia de este ticket.');
  }
}

/** El importe total del ticket no puede ser negativo. */
export class ReceiptInvalidTotalError extends BudgetDomainError {
  readonly code = 'RECEIPT_INVALID_TOTAL';
  constructor() {
    super('El importe total no puede ser negativo.');
  }
}

/** El importe de una línea no puede ser negativo. */
export class ReceiptLineTotalNegativeError extends BudgetDomainError {
  readonly code = 'RECEIPT_LINE_TOTAL_NEGATIVE';
  constructor() {
    super('El importe de una línea no puede ser negativo.');
  }
}

/** La IA no está disponible (sin balance o error de red). */
export class AiUnavailableError extends BudgetDomainError {
  readonly code = 'AI_UNAVAILABLE';
  constructor(reason?: string) {
    super(reason ?? 'El servicio de IA no está disponible en este momento. Inténtalo de nuevo más tarde.');
  }
}
