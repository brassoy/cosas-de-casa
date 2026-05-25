/**
 * Errores de dominio del contexto identity-access (TS puro, sin Nest).
 * La capa de interfaz los traduce a 401.
 */
export abstract class AuthDomainError extends Error {
  abstract readonly code: string;
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Falta el token, está mal formado, caducado o la firma no valida. */
export class InvalidTokenError extends AuthDomainError {
  readonly code = 'INVALID_TOKEN';
  constructor() {
    super('No estás autenticado o tu sesión ha caducado.');
  }
}
