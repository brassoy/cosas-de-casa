import type { ItemComment } from '../shopping-list';

export const ITEM_COMMENT_REPOSITORY = Symbol('ITEM_COMMENT_REPOSITORY');

/** Puerto de persistencia de comentarios de ítems. */
export interface ItemCommentRepository {
  /** Persiste un comentario nuevo. */
  create(comment: ItemComment): Promise<void>;

  /** Devuelve los comentarios de un ítem ordenados por createdAt ASC. */
  findByItem(itemId: string): Promise<ItemComment[]>;
}
