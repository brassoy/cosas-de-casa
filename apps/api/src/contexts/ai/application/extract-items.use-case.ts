import { Inject, Injectable } from '@nestjs/common';
import {
  ITEM_EXTRACTION_PORT,
  type ItemExtractionPort,
} from '../domain/ports/item-extraction.port';

export interface ExtractItemsCommand {
  phrase: string;
}

/** Caso de uso: extraer artículos de la compra de una frase en lenguaje natural. */
@Injectable()
export class ExtractItemsUseCase {
  constructor(
    @Inject(ITEM_EXTRACTION_PORT)
    private readonly extractor: ItemExtractionPort,
  ) {}

  async execute(command: ExtractItemsCommand): Promise<string[]> {
    return this.extractor.extractItems(command.phrase);
  }
}
