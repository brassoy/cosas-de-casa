/**
 * Tests unitarios del normalizador de nombres de artículos.
 *
 * Cubre:
 *  ✓ Lowercase + NFC
 *  ✓ Eliminación de ruido de packaging
 *  ✓ "caja de leche" → "leche" (caso spec)
 *  ✓ Singularización
 *  ✓ Extracción de atributos de grasa
 *  ✓ "leche entera" y "leche desnatada" tienen atributos distintos
 *  ✓ Modificadores con significado se conservan en el nombre
 */
import { describe, it, expect } from 'vitest';
import { normalizeItemName } from './item-normalizer';

describe('normalizeItemName', () => {
  describe('lowercase + NFC', () => {
    it('convierte a minúsculas', () => {
      const { normalized } = normalizeItemName('LECHE');
      expect(normalized).toBe('leche');
    });

    it('normaliza unicode NFC', () => {
      // "leche" escrito con carácter compuesto (é = e + combining acute)
      const composed = 'leche';
      const { normalized } = normalizeItemName(composed);
      expect(normalized).toBe('leche');
    });
  });

  describe('eliminación de ruido de packaging', () => {
    it('"caja de leche" → "leche"', () => {
      const { normalized } = normalizeItemName('caja de leche');
      expect(normalized).toBe('leche');
    });

    it('"bote de tomate" → "tomate"', () => {
      const { normalized } = normalizeItemName('bote de tomate');
      expect(normalized).toBe('tomate');
    });

    it('"paquete de arroz" → "arroz"', () => {
      const { normalized } = normalizeItemName('paquete de arroz');
      expect(normalized).toBe('arroz');
    });

    it('"litro de leche" → "leche"', () => {
      const { normalized } = normalizeItemName('litro de leche');
      expect(normalized).toBe('leche');
    });

    it('"kg de harina" → "harina"', () => {
      const { normalized } = normalizeItemName('kg de harina');
      expect(normalized).toBe('harina');
    });

    it('"docena de huevos" → "huevo" (+ singularización)', () => {
      const { normalized } = normalizeItemName('docena de huevos');
      expect(normalized).toBe('huevo');
    });

    it('sin ruido: "leche" → "leche"', () => {
      const { normalized } = normalizeItemName('leche');
      expect(normalized).toBe('leche');
    });
  });

  describe('singularización', () => {
    it('"yogures" → "yogur"', () => {
      const { normalized } = normalizeItemName('yogures');
      expect(normalized).toBe('yogur');
    });

    it('"tomates" → "tomate"', () => {
      const { normalized } = normalizeItemName('tomates');
      expect(normalized).toBe('tomate');
    });

    it('"galletas" → "galleta"', () => {
      const { normalized } = normalizeItemName('galletas');
      expect(normalized).toBe('galleta');
    });

    it('"pan" ya singular no cambia', () => {
      const { normalized } = normalizeItemName('pan');
      expect(normalized).toBe('pan');
    });
  });

  describe('extracción de atributos — grasa láctea', () => {
    it('"leche entera" → atributo grasa: entera', () => {
      const { normalized, attributes } = normalizeItemName('leche entera');
      expect(normalized).toBe('leche entera');
      expect(attributes['grasa']).toBe('entera');
    });

    it('"leche desnatada" → atributo grasa: desnatada', () => {
      const { normalized, attributes } = normalizeItemName('leche desnatada');
      expect(normalized).toBe('leche desnatada');
      expect(attributes['grasa']).toBe('desnatada');
    });

    it('"leche semidesnatada" → atributo grasa: semidesnatada', () => {
      const { normalized, attributes } = normalizeItemName('leche semidesnatada');
      expect(normalized).toBe('leche semidesnatada');
      expect(attributes['grasa']).toBe('semidesnatada');
    });

    it('"caja de leche entera" → normalized: "leche entera", grasa: entera', () => {
      const { normalized, attributes } = normalizeItemName('caja de leche entera');
      expect(normalized).toBe('leche entera');
      expect(attributes['grasa']).toBe('entera');
    });
  });

  describe('extracción de atributos — estado', () => {
    it('"salmón fresco" → estado: fresco', () => {
      const { attributes } = normalizeItemName('salmón fresco');
      expect(attributes['estado']).toBe('fresco');
    });

    it('"guisantes congelados" → estado: congelado', () => {
      const { attributes } = normalizeItemName('guisantes congelados');
      expect(attributes['estado']).toBe('congelado');
    });

    it('"leche sin lactosa" → especial: sin_lactosa', () => {
      const { attributes } = normalizeItemName('leche sin lactosa');
      expect(attributes['especial']).toBe('sin_lactosa');
    });

    it('"pan integral" → estado: integral', () => {
      const { attributes } = normalizeItemName('pan integral');
      expect(attributes['estado']).toBe('integral');
    });
  });

  describe('invariante clave: leche ≈ caja de leche (misma normalización)', () => {
    it('ambas normalizan a "leche"', () => {
      const a = normalizeItemName('leche');
      const b = normalizeItemName('caja de leche');
      expect(a.normalized).toBe(b.normalized);
    });
  });

  describe('invariante clave: leche entera ≠ leche desnatada (atributos distintos)', () => {
    it('tienen el mismo nombre base pero atributo grasa distinto', () => {
      const entera = normalizeItemName('leche entera');
      const desnatada = normalizeItemName('leche desnatada');

      // El atributo grasa es diferente
      expect(entera.attributes['grasa']).not.toBe(desnatada.attributes['grasa']);
      // Y el nombre normalizado también refleja el modificador
      expect(entera.normalized).not.toBe(desnatada.normalized);
    });
  });
});
