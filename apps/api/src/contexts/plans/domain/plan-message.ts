/** Entidad: mensaje de chat de un plan. */
export interface PlanMessageProps {
  id: string;
  planId: string;
  userId: string;
  body: string;
  createdAt: Date;
}

export const MAX_MESSAGE_BODY_LENGTH = 2000;

export class PlanMessage {
  readonly id: string;
  readonly planId: string;
  readonly userId: string;
  readonly body: string;
  readonly createdAt: Date;

  constructor(props: PlanMessageProps) {
    this.id = props.id;
    this.planId = props.planId;
    this.userId = props.userId;
    this.body = props.body;
    this.createdAt = props.createdAt;
  }

  /** Sanitiza el body: elimina HTML y recorta whitespace. */
  static sanitizeBody(raw: string): string {
    // Elimina etiquetas HTML con una expresión simple (no usar en producción con HTML complejo
    // pero es suficiente para prevenir XSS en mensajes de chat de texto plano).
    return raw.replace(/<[^>]*>/g, '').trim().slice(0, MAX_MESSAGE_BODY_LENGTH);
  }
}
