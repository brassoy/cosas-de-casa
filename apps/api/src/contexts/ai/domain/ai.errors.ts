/**
 * Errores de dominio del contexto `ai`.
 *
 * TS puro: NO conocen HTTP ni Nest. La capa de interfaz (filtro) los traduce a
 * códigos de estado. Cada uno lleva un `code` estable para el cliente y un
 * mensaje en español de España (tuteo) listo para mostrar en la UI.
 */
export abstract class AiDomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** La IA no está disponible (sin configurar, sin balance o error de red). */
export class AiUnavailableError extends AiDomainError {
  readonly code = 'AI_UNAVAILABLE';
  constructor(reason?: string) {
    super(
      reason ??
        'El servicio de IA no está disponible en este momento. Inténtalo de nuevo más tarde.',
    );
  }
}
