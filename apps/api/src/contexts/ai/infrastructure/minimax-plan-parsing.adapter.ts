/**
 * Adaptador de autocompletado de plan usando MiniMax (SDK Anthropic).
 *
 * Usa `tool_choice` forzado para obtener una salida estructurada multi-campo
 * `{ title, description, scheduledAt, placeQuery }`. Resuelve expresiones de
 * tiempo relativas a partir del `now` que recibe.
 *
 * Si MiniMax no está disponible o sin balance → lanza AiUnavailableError.
 */

import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiUnavailableError } from '../domain/ai.errors';
import type { PlanParsingPort, ParsedPlan } from '../domain/ports/plan-parsing.port';
import type { MiniMaxConfig } from './minimax-item-extraction.adapter';

const PARSE_PLAN_TOOL = {
  name: 'parse_plan',
  description:
    'Rellena los campos de un plan familiar a partir de lo que el usuario ha dicho o escrito. ' +
    'Devuelve un título corto, una descripción, la fecha/hora del plan y una consulta de lugar buscable en mapas. ' +
    'Cualquier campo que no puedas inferir con confianza debe ir a null.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: ['string', 'null'] as const,
        description: 'Título corto y claro del plan (3-6 palabras), o null si no se puede inferir.',
      },
      description: {
        type: ['string', 'null'] as const,
        description: 'Descripción breve del plan en una o dos frases, o null.',
      },
      scheduledAt: {
        type: ['string', 'null'] as const,
        description:
          'Fecha y hora del plan en formato ISO 8601 con zona (p. ej. 2026-06-23T18:30:00.000Z). ' +
          'Resuelve expresiones relativas ("en dos horas", "mañana a las 5", "este sábado") tomando como referencia el instante "now" que se indica en el mensaje. Null si no hay ninguna pista temporal.',
      },
      placeQuery: {
        type: ['string', 'null'] as const,
        description:
          'Texto buscable en Google Maps para localizar el sitio: nombre del lugar más la ciudad o zona ' +
          '(p. ej. "Parque de Ateca, Santander"). No inventes direcciones exactas ni coordenadas. Null si no se menciona ningún lugar.',
      },
    },
    required: ['title', 'description', 'scheduledAt', 'placeQuery'],
  },
} satisfies Anthropic.Tool;

export class MinimaxPlanParsingAdapter implements PlanParsingPort {
  private readonly logger = new Logger(MinimaxPlanParsingAdapter.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: MiniMaxConfig) {
    this.client = new Anthropic({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async parsePlan(phrase: string, now: string): Promise<ParsedPlan> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        tools: [PARSE_PLAN_TOOL],
        tool_choice: { type: 'tool', name: 'parse_plan' },
        messages: [
          {
            role: 'user',
            content:
              `Instante actual de referencia (now): ${now}. ` +
              `Resuelve cualquier expresión temporal relativa respecto a ese instante y devuélvela en ISO 8601. ` +
              `Frase del usuario sobre un plan familiar: "${phrase}"`,
          },
        ],
      });

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (!toolUseBlock || toolUseBlock.name !== 'parse_plan') {
        this.logger.warn('MiniMax no devolvió tool_use para el plan; lanzando AiUnavailableError.');
        throw new AiUnavailableError('La IA no pudo interpretar el plan.');
      }

      const input = toolUseBlock.input as {
        title?: unknown;
        description?: unknown;
        scheduledAt?: unknown;
        placeQuery?: unknown;
      };

      return {
        title: cleanString(input.title),
        description: cleanString(input.description),
        scheduledAt: cleanString(input.scheduledAt),
        placeQuery: cleanString(input.placeQuery),
      };
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;

      const message = (err as Error).message ?? '';
      this.logger.error(`Error MiniMax parse-plan: ${message}`);

      if (
        message.includes('balance') ||
        message.includes('credit') ||
        message.includes('quota') ||
        message.includes('rate') ||
        message.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('payment')
      ) {
        throw new AiUnavailableError('Sin crédito o límite de tasa alcanzado.');
      }

      throw new AiUnavailableError(`Error de IA: ${message}`);
    }
  }
}

/** Normaliza un valor a `string` no vacío o `null` (la IA puede devolver ""). */
function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
