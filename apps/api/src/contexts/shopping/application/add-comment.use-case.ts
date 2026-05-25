import { Inject, Injectable } from '@nestjs/common';
import { ItemComment } from '../domain/shopping-list';
import { ItemNotFoundError } from '../domain/shopping.errors';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import {
  ITEM_COMMENT_REPOSITORY,
  type ItemCommentRepository,
} from '../domain/ports/item-comment.repository';
import { SHOPPING_CLOCK, type ShoppingClock } from './ports/clock';
import { SHOPPING_ID_GENERATOR, type ShoppingIdGenerator } from './ports/id-generator';

export interface AddCommentCommand {
  itemId: string;
  actingUserId: string;
  body: string;
}

/** Caso de uso: añadir un comentario a un ítem. */
@Injectable()
export class AddCommentUseCase {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY) private readonly items: ShoppingItemRepository,
    @Inject(ITEM_COMMENT_REPOSITORY) private readonly comments: ItemCommentRepository,
    @Inject(SHOPPING_CLOCK) private readonly clock: ShoppingClock,
    @Inject(SHOPPING_ID_GENERATOR) private readonly ids: ShoppingIdGenerator,
  ) {}

  async execute(command: AddCommentCommand): Promise<ItemComment> {
    const item = await this.items.findById(command.itemId);
    if (!item) {
      throw new ItemNotFoundError();
    }

    const comment = ItemComment.create({
      id: this.ids.generate(),
      itemId: command.itemId,
      authorId: command.actingUserId,
      body: command.body,
      now: this.clock.now(),
    });

    await this.comments.create(comment);
    return comment;
  }
}
