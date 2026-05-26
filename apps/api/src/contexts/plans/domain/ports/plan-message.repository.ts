import type { PlanMessage } from '../plan-message';

export const PLAN_MESSAGE_REPOSITORY = Symbol('PLAN_MESSAGE_REPOSITORY');

export interface ListMessagesParams {
  planId: string;
  /** Cursor: solo mensajes anteriores a esta fecha (paginación hacia atrás). */
  before?: Date;
  limit?: number;
}

export interface PlanMessageWithUser {
  id: string;
  planId: string;
  userId: string;
  displayName: string | null;
  body: string;
  createdAt: Date;
}

export interface PlanMessageRepository {
  insert(message: PlanMessage): Promise<void>;
  /**
   * Lista mensajes paginados (orden DESC por createdAt) con displayName del usuario.
   * Devuelve hasta `limit` mensajes anteriores a `before`.
   */
  listWithUsers(params: ListMessagesParams): Promise<PlanMessageWithUser[]>;
}
