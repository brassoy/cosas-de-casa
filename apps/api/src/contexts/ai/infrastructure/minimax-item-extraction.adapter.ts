/**
 * Adaptador de extracción de artículos usando MiniMax
 * a través del SDK compatible con Anthropic.
 *
 * Usa tool_choice forzado a "extract_items" para obtener una salida
 * estructurada (array de strings). Si MiniMax no soporta tool_choice
 * forzado o falla, hace fallback a parseo de texto plano.
 */

import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { ItemExtractionPort } from '../domain/ports/item-extraction.port';

export interface MiniMaxConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

const EXTRACT_ITEMS_TOOL = {
  name: 'extract_items',
  description:
    'Extrae la lista de artículos de la compra mencionados en la frase del usuario. ' +
    'Devuelve únicamente los nombres de los artículos, en plural o singular según lo dicho, ' +
    'sin cantidades ni unidades.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Lista de artículos extraídos de la frase.',
      },
    },
    required: ['items'],
  },
} satisfies Anthropic.Tool;

/**
 * Fallback de parseo cuando tool_choice no funciona:
 * separa por comas/punto y coma/saltos de línea y limpia cada token.
 */
function parseTextFallback(text: string): string[] {
  return text
    .split(/[,;|\n]+/)
    .map((s) =>
      s
        .replace(/^\d+[.)]\s*/, '') // elimina numeración "1. " o "1) "
        .replace(/^[-•*]\s*/, '')     // elimina bullets
        .trim(),
    )
    .filter((s) => s.length > 0 && s.length < 200);
}

export class MinimaxItemExtractionAdapter implements ItemExtractionPort {
  private readonly logger = new Logger(MinimaxItemExtractionAdapter.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: MiniMaxConfig) {
    this.client = new Anthropic({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async extractItems(phrase: string): Promise<string[]> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        tools: [EXTRACT_ITEMS_TOOL],
        tool_choice: { type: 'tool', name: 'extract_items' },
        messages: [
          {
            role: 'user',
            content: `Extrae los productos de la lista de la compra de la siguiente frase: "${phrase}"`,
          },
        ],
      });

      // Buscar el bloque tool_use en la respuesta
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlock && toolUseBlock.name === 'extract_items') {
        const input = toolUseBlock.input as { items?: unknown };
        if (Array.isArray(input.items)) {
          const items = input.items.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0,
          );
          if (items.length > 0) {
            this.logger.debug(
              `MiniMax tool_use OK: ${items.length} artículos extraídos de "${phrase}"`,
            );
            return items.map((s) => s.trim());
          }
        }
      }

      // Fallback: buscar bloque de texto en la respuesta
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      if (textBlock) {
        this.logger.warn(
          'MiniMax no devolvió tool_use; usando parseo de texto como fallback.',
        );
        return parseTextFallback(textBlock.text);
      }

      this.logger.warn('MiniMax devolvió respuesta vacía; retornando array vacío.');
      return [];
    } catch (err) {
      this.logger.error(
        `Error llamando a MiniMax: ${(err as Error).message}. Retornando array vacío.`,
      );
      return [];
    }
  }
}
