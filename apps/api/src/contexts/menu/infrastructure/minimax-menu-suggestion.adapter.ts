/**
 * Adaptador de sugerencia de menú usando MiniMax (SDK Anthropic).
 *
 * Usa tool_choice forzado para salida estructurada.
 * Si MiniMax no está disponible o sin balance → lanza MenuAiUnavailableError.
 */

import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { MenuAiUnavailableError } from '../domain/menu.errors';
import type { MenuSuggestionPort, SuggestMenuResult } from '../domain/ports/menu-suggestion.port';
import type { MiniMaxConfig } from '../../ai/infrastructure/minimax-item-extraction.adapter';

const SUGGEST_MENU_TOOL = {
  name: 'suggest_menu',
  description:
    'Sugiere platos de menú para una semana basándote en los ingredientes disponibles en la nevera. ' +
    'Para cada plato, indica qué ingredientes disponibles usa y cuáles faltan y habría que comprar.',
  input_schema: {
    type: 'object' as const,
    properties: {
      dishes: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const, description: 'Nombre del plato.' },
            description: { type: 'string' as const, description: 'Descripción breve del plato.' },
            usesFromFridge: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Ingredientes de la nevera que usa este plato.',
            },
            missingIngredients: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Ingredientes que faltan y habría que comprar para este plato.',
            },
          },
          required: ['name', 'usesFromFridge', 'missingIngredients'],
        },
      },
    },
    required: ['dishes'],
  },
} satisfies Anthropic.Tool;

export class MinimaxMenuSuggestionAdapter implements MenuSuggestionPort {
  private readonly logger = new Logger(MinimaxMenuSuggestionAdapter.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: MiniMaxConfig) {
    this.client = new Anthropic({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async suggest(fridgeItems: string[], dishCount: number): Promise<SuggestMenuResult> {
    try {
      const fridgeList =
        fridgeItems.length > 0
          ? fridgeItems.join(', ')
          : '(nevera vacía, sugiere platos sencillos con ingredientes básicos)';

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        tools: [SUGGEST_MENU_TOOL],
        tool_choice: { type: 'tool', name: 'suggest_menu' },
        messages: [
          {
            role: 'user',
            content:
              `Sugiere ${dishCount} platos para el menú de la semana. ` +
              `Ingredientes disponibles en la nevera: ${fridgeList}. ` +
              `Para cada plato indica qué ingredientes de la nevera usa y cuáles habría que comprar.`,
          },
        ],
      });

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (!toolUseBlock || toolUseBlock.name !== 'suggest_menu') {
        this.logger.warn('MiniMax no devolvió tool_use para menú; lanzando MenuAiUnavailableError.');
        throw new MenuAiUnavailableError('La IA no pudo sugerir el menú.');
      }

      const input = toolUseBlock.input as {
        dishes?: Array<{
          name: string;
          description?: string;
          usesFromFridge: string[];
          missingIngredients: string[];
        }>;
      };

      return {
        dishes: (input.dishes ?? []).map((d) => ({
          name: d.name,
          description: d.description,
          usesFromFridge: d.usesFromFridge ?? [],
          missingIngredients: d.missingIngredients ?? [],
        })),
      };
    } catch (err) {
      if (err instanceof MenuAiUnavailableError) throw err;

      const message = (err as Error).message ?? '';
      this.logger.error(`Error MiniMax menú: ${message}`);

      if (
        message.includes('balance') ||
        message.includes('credit') ||
        message.includes('quota') ||
        message.includes('rate') ||
        message.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('payment')
      ) {
        throw new MenuAiUnavailableError('Sin crédito o límite de tasa alcanzado.');
      }

      throw new MenuAiUnavailableError(`Error de IA: ${message}`);
    }
  }
}
