/**
 * Puerto de dominio para extracción de artículos de la compra
 * a partir de una frase en lenguaje natural.
 *
 * El adaptador usa la API de MiniMax (compatible con Anthropic SDK)
 * con tool_choice forzado; si falla, hace fallback a parseo de texto plano.
 */
export interface ItemExtractionPort {
  extractItems(phrase: string): Promise<string[]>;
}

export const ITEM_EXTRACTION_PORT = Symbol('ItemExtractionPort');
