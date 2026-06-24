import { Inject, Injectable } from '@nestjs/common';
import {
  MENU_SUGGESTION_PORT,
  type MenuSuggestionPort,
  type SuggestMenuResult,
} from '../domain/ports/menu-suggestion.port';
import {
  FRIDGE_ITEM_REPOSITORY,
  type FridgeItemRepository,
} from '../../fridge/domain/ports/fridge-item.repository';

export interface SuggestMenuCommand {
  familyId: string;
  dishCount?: number;
}

const DEFAULT_DISH_COUNT = 5;

/** Caso de uso: sugerir menú a partir del contenido de la nevera (IA). */
@Injectable()
export class SuggestMenuUseCase {
  constructor(
    @Inject(MENU_SUGGESTION_PORT) private readonly suggestionPort: MenuSuggestionPort,
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly fridgeRepo: FridgeItemRepository,
  ) {}

  async execute(command: SuggestMenuCommand): Promise<SuggestMenuResult> {
    const fridgeItems = await this.fridgeRepo.findByFamily(command.familyId);
    // Los productos tirados (DISCARDED) no se mandan a la IA: ya no están en casa.
    const itemNames = fridgeItems
      .filter((i) => i.location !== 'DISCARDED')
      .map((i) => i.name);

    const dishCount = command.dishCount ?? DEFAULT_DISH_COUNT;

    // El puerto lanza MenuAiUnavailableError si la IA no está disponible.
    return this.suggestionPort.suggest(itemNames, dishCount);
  }
}
