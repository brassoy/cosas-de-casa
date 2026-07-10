/**
 * Adaptador de OCR de tickets usando MiniMax a través del SDK Anthropic.
 *
 * Usa tool_choice forzado para obtener una salida estructurada.
 * Si MiniMax no está disponible o sin balance, lanza AiUnavailableError.
 */

import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiUnavailableError } from '../domain/budget.errors';
import type { ReceiptOcrPort, ExtractReceiptResult, ExtractedLine } from '../domain/ports/receipt-ocr.port';
import type { MiniMaxConfig } from '../../ai/infrastructure/minimax-item-extraction.adapter';

/** Media types de imagen que acepta la API de mensajes (bloque `image`). */
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/**
 * Deduce el media type real a partir de los primeros bytes del base64 (magic
 * numbers), sin depender del prefijo `data:` que la web ya ha eliminado.
 *
 * La web garantiza JPEG (comprime con `fileType: 'image/jpeg'`), así que en el
 * flujo normal esto devuelve siempre `image/jpeg`. La detección es una defensa
 * barata para llamadas directas a la API o formatos inesperados: enviar el
 * `media_type` correcto evita que el proveedor rechace la imagen por un
 * `image/jpeg` mal declarado. Por defecto asume JPEG.
 */
export function detectImageMediaType(imageBase64: string): ImageMediaType {
  if (imageBase64.startsWith('/9j/')) return 'image/jpeg';
  if (imageBase64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (imageBase64.startsWith('UklGR')) return 'image/webp';
  if (imageBase64.startsWith('R0lGOD')) return 'image/gif';
  return 'image/jpeg';
}

const EXTRACT_RECEIPT_TOOL = {
  name: 'extract_receipt',
  description:
    'Extrae los datos del ticket de compra de la imagen. ' +
    'Devuelve el comercio, la fecha, el total, la moneda y las líneas del ticket. ' +
    'Para cada línea, infiere la categoría (groceries, household, dining_out, leisure, other).',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchant: { type: 'string' as const, description: 'Nombre del comercio o tienda.' },
      purchasedAt: {
        type: 'string' as const,
        description: 'Fecha de compra en formato YYYY-MM-DD.',
      },
      total: { type: 'number' as const, description: 'Importe total del ticket.' },
      currency: { type: 'string' as const, description: 'Código de moneda, p.ej. EUR.' },
      lines: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            description: { type: 'string' as const },
            quantity: { type: 'number' as const },
            unitPrice: { type: 'number' as const },
            lineTotal: { type: 'number' as const },
            category: {
              type: 'string' as const,
              enum: ['groceries', 'household', 'dining_out', 'leisure', 'other'],
            },
          },
          required: ['description', 'lineTotal', 'category'],
        },
      },
    },
    required: ['lines'],
  },
} satisfies Anthropic.Tool;

export class MinimaxReceiptOcrAdapter implements ReceiptOcrPort {
  private readonly logger = new Logger(MinimaxReceiptOcrAdapter.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: MiniMaxConfig) {
    this.client = new Anthropic({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async extract(imageBase64: string): Promise<ExtractReceiptResult> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        tools: [EXTRACT_RECEIPT_TOOL],
        tool_choice: { type: 'tool', name: 'extract_receipt' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae todos los datos de este ticket de compra.',
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: detectImageMediaType(imageBase64),
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      });

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (!toolUseBlock || toolUseBlock.name !== 'extract_receipt') {
        this.logger.warn('MiniMax OCR no devolvió tool_use; lanzando AiUnavailableError.');
        throw new AiUnavailableError('La IA no pudo extraer los datos del ticket.');
      }

      const input = toolUseBlock.input as {
        merchant?: string;
        purchasedAt?: string;
        total?: number;
        currency?: string;
        lines?: Array<{
          description: string;
          quantity?: number;
          unitPrice?: number;
          lineTotal: number;
          category: string;
        }>;
      };

      const VALID_CATEGORIES = ['groceries', 'household', 'dining_out', 'leisure', 'other'];

      const lines: ExtractedLine[] = (input.lines ?? []).map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        category: VALID_CATEGORIES.includes(l.category)
          ? (l.category as ExtractedLine['category'])
          : 'other',
      }));

      return {
        merchant: input.merchant,
        purchasedAt: input.purchasedAt,
        total: input.total,
        currency: input.currency,
        lines,
      };
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;

      const message = (err as Error).message ?? '';
      this.logger.error(`Error MiniMax OCR: ${message}`);

      // Detectar errores de balance / autenticación → AiUnavailableError
      if (
        message.includes('balance') ||
        message.includes('credit') ||
        message.includes('quota') ||
        message.includes('rate') ||
        message.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('payment')
      ) {
        throw new AiUnavailableError('Sin crédito o límite de tasa alcanzado en el servicio de IA.');
      }

      throw new AiUnavailableError(`Error de IA: ${message}`);
    }
  }
}
