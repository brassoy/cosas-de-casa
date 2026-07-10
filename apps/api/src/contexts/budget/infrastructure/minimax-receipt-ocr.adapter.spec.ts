/**
 * Tests unitarios del adaptador de OCR de tickets (MiniMax).
 *
 * Cobertura de `detectImageMediaType`: la web ya elimina el prefijo `data:`,
 * así que el adaptador deduce el media type de los magic numbers del base64.
 *  ✓ JPEG (FF D8 FF)  → image/jpeg
 *  ✓ PNG  (89 50 4E 47) → image/png
 *  ✓ WEBP (RIFF…WEBP) → image/webp
 *  ✓ GIF  (GIF89a)    → image/gif
 *  ✓ base64 irreconocible → por defecto image/jpeg
 */
import { describe, expect, it } from 'vitest';
import { detectImageMediaType } from './minimax-receipt-ocr.adapter';

describe('detectImageMediaType', () => {
  it('detecta JPEG por el magic number FF D8 FF', () => {
    // Buffer.from([0xFF,0xD8,0xFF,0xE0,...]).toString('base64')
    expect(detectImageMediaType('/9j/4AAQ')).toBe('image/jpeg');
  });

  it('detecta PNG por la firma 89 50 4E 47', () => {
    expect(detectImageMediaType('iVBORw0KGgoAAA==')).toBe('image/png');
  });

  it('detecta WEBP por el contenedor RIFF…WEBP', () => {
    expect(detectImageMediaType('UklGRgAAAABXRUJQ')).toBe('image/webp');
  });

  it('detecta GIF por la cabecera GIF89a', () => {
    expect(detectImageMediaType('R0lGODlh')).toBe('image/gif');
  });

  it('por defecto asume JPEG cuando la firma no se reconoce', () => {
    expect(detectImageMediaType('aGVsbG8gd29ybGQ=')).toBe('image/jpeg');
  });
});
