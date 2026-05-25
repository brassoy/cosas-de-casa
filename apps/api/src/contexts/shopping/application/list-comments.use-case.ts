import { Inject, Injectable } from '@nestjs/common';
import type { ItemComment } from '../domain/shopping-list';
import { ItemNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import {
  ITEM_COMMENT_REPOSITORY,
  type ItemCommentRepository,
} from '../domain/ports/item-comment.repository';

export interface ListCommentsCommand {
  itemId: string;
}

/** Caso de uso: listar los comentarios de un ítem. */
@Injectable()
export class ListCommentsUseCase {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
    @Inject(ITEM_COMMENT_REPOSITORY) private readonly comments: ItemCommentRepository,
  ) {}

  async execute(command: ListCommentsCommand): Promise<ItemComment[]> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new ItemNotFoundError();
    }

    return this.comments.findByItem(command.itemId);
  }
}
