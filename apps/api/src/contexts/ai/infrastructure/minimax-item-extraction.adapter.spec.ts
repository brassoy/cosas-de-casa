/**
 * Tests unitarios del adaptador de extracción de artículos (MiniMax).
 *
 * Verifican el gating de IA (ADR 0014):
 *  ✓ respuesta válida con items → los devuelve
 *  ✓ respuesta válida SIN items → [] (no es un fallo)
 *  ✓ fallback a texto plano cuando no hay tool_use
 *  ✓ error de auth/balance/cuota/rate → AiUnavailableError
 *  ✓ error de red genérico → AiUnavailableError
 *  ✓ respuesta sin contenido utilizable → AiUnavailableError
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MinimaxItemExtractionAdapter } from './minimax-item-extraction.adapter';
import { AiUnavailableError } from '../domain/ai.errors';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class AnthropicMock {
    messages = { create: createMock };
  },
}));

function makeAdapter(): MinimaxItemExtractionAdapter {
  return new MinimaxItemExtractionAdapter({
    baseURL: 'https://minimax.test',
    apiKey: 'test-key',
    model: 'test-model',
  });
}

beforeEach(() => {
  createMock.mockReset();
});

describe('MinimaxItemExtractionAdapter', () => {
  it('devuelve los artículos cuando la IA responde con tool_use', async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'extract_items',
          input: { items: [' leche ', 'pan', '', 42] },
        },
      ],
    });

    const items = await makeAdapter().extractItems('leche y pan');
    expect(items).toEqual(['leche', 'pan']);
  });

  it('devuelve [] cuando la IA responde correctamente y no hay artículos', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'extract_items', input: { items: [] } }],
    });

    const items = await makeAdapter().extractItems('hola, ¿qué tal?');
    expect(items).toEqual([]);
  });

  it('hace fallback a parseo de texto plano si no hay tool_use', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: '1. leche\n2. pan, huevos' }],
    });

    const items = await makeAdapter().extractItems('leche, pan y huevos');
    expect(items).toEqual(['leche', 'pan', 'huevos']);
  });

  it('lanza AiUnavailableError ante un error de autenticación del proveedor', async () => {
    createMock.mockRejectedValue(new Error('401 authentication_error: invalid api key'));

    await expect(makeAdapter().extractItems('leche')).rejects.toThrow(AiUnavailableError);
  });

  it('lanza AiUnavailableError ante un error de balance/cuota', async () => {
    createMock.mockRejectedValue(new Error('insufficient balance to complete request'));

    await expect(makeAdapter().extractItems('leche')).rejects.toThrow(
      'Sin crédito o límite de tasa alcanzado.',
    );
  });

  it('lanza AiUnavailableError ante un error de red genérico', async () => {
    createMock.mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

    await expect(makeAdapter().extractItems('leche')).rejects.toThrow(AiUnavailableError);
  });

  it('lanza AiUnavailableError si la respuesta no tiene contenido utilizable', async () => {
    createMock.mockResolvedValue({ content: [] });

    await expect(makeAdapter().extractItems('leche')).rejects.toThrow(AiUnavailableError);
  });
});
