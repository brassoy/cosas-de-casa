/**
 * Adaptador de autocompletado de tarea usando MiniMax (SDK Anthropic).
 *
 * Usa `tool_choice` forzado para obtener una salida estructurada multi-campo
 * `{ title, description, recommendedDate, deadlineDate }`. Resuelve expresiones
 * de tiempo relativas como fechas sin hora (YYYY-MM-DD) a partir del `now` que
 * recibe.
 *
 * Si MiniMax no está disponible o sin balance → lanza AiUnavailableError.
 */

import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiUnavailableError } from '../domain/ai.errors';
import type { TaskParsingPort, ParsedTask } from '../domain/ports/task-parsing.port';
import type { MiniMaxConfig } from './minimax-item-extraction.adapter';

// IMPORTANTE: los campos usan `type: 'string'` ESCALAR, no la unión
// `['string', 'null']`. MiniMax-M2 no soporta el tipo unión en tool-calling: si
// se declara, devuelve TODOS los campos a null (verificado contra el endpoint
// real). Para que resuelva de verdad, `title`/`description` van en `required`
// (fuerzan la llamada al tool y siempre son inferibles) y las fechas quedan
// OPCIONALES: la IA las OMITE cuando no hay pista temporal (con las fechas en
// `required` las inventa). `cleanString` trata el campo ausente como null.
const PARSE_TASK_TOOL = {
  name: 'parse_task',
  description:
    'Rellena los campos de una tarea doméstica a partir de lo que el usuario ha dicho o escrito. ' +
    'Devuelve un título corto, una descripción, la fecha recomendada para realizarla y la fecha límite. ' +
    'Cualquier campo que no puedas inferir con confianza, omítelo (no lo incluyas en la respuesta).',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        description: 'Título corto y claro de la tarea (3-6 palabras).',
      },
      description: {
        type: 'string' as const,
        description: 'Descripción breve de la tarea en una o dos frases.',
      },
      recommendedDate: {
        type: 'string' as const,
        description:
          'Fecha recomendada para realizar la tarea en formato YYYY-MM-DD (fecha sin hora, p. ej. 2026-06-23). ' +
          'Resuelve expresiones relativas ("mañana", "el viernes", "en dos semanas") tomando como referencia el instante "now" que se indica en el mensaje. Omítelo si no hay ninguna pista temporal.',
      },
      deadlineDate: {
        type: 'string' as const,
        description:
          'Fecha límite de la tarea en formato YYYY-MM-DD (fecha sin hora, p. ej. 2026-06-30). ' +
          'Resuelve expresiones relativas ("antes del lunes", "para fin de mes") respecto al instante "now" del mensaje. Omítelo si no se menciona ninguna fecha límite.',
      },
    },
    required: ['title', 'description'],
  },
} satisfies Anthropic.Tool;

export class MinimaxTaskParsingAdapter implements TaskParsingPort {
  private readonly logger = new Logger(MinimaxTaskParsingAdapter.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: MiniMaxConfig) {
    this.client = new Anthropic({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async parseTask(phrase: string, now: string): Promise<ParsedTask> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        tools: [PARSE_TASK_TOOL],
        tool_choice: { type: 'tool', name: 'parse_task' },
        messages: [
          {
            role: 'user',
            content:
              `Instante actual de referencia (now): ${now}. ` +
              `Resuelve cualquier expresión temporal relativa respecto a ese instante y devuélvela como fecha sin hora en formato YYYY-MM-DD. ` +
              `Frase del usuario sobre una tarea doméstica: "${phrase}"`,
          },
        ],
      });

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (!toolUseBlock || toolUseBlock.name !== 'parse_task') {
        this.logger.warn('MiniMax no devolvió tool_use para la tarea; lanzando AiUnavailableError.');
        throw new AiUnavailableError('La IA no pudo interpretar la tarea.');
      }

      const input = toolUseBlock.input as {
        title?: unknown;
        description?: unknown;
        recommendedDate?: unknown;
        deadlineDate?: unknown;
      };

      return {
        title: cleanString(input.title),
        description: cleanString(input.description),
        recommendedDate: cleanString(input.recommendedDate),
        deadlineDate: cleanString(input.deadlineDate),
      };
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;

      const message = (err as Error).message ?? '';
      this.logger.error(`Error MiniMax parse-task: ${message}`);

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
