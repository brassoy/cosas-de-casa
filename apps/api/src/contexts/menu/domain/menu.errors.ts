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
