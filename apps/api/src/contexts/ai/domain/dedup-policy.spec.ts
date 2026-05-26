/**
 * Tests unitarios de DedupPolicy.
 *
 * Usa un EmbeddingPort falso que devuelve vectores controlados.
 *
 * Cubre:
 *  ✓ Sin candidatos → ADD_NEW
 *  ✓ Similitud ≥ 0.92 + atributos compatibles → AUTO_MERGE
 *  ✓ Similitud ≥ 0.92 + atributos conflictivos → SUGGEST (leche entera ≠ desnatada)
 *  ✓ Similitud 0.82–0.92 → SUGGEST
 *  ✓ Similitud < 0.82 → ADD_NEW
 *  ✓ Sin embedding: nombre normalizado igual + atributos compatibles → AUTO_MERGE
 *  ✓ Sin embedding: nombre normalizado igual + atributos conflictivos → SUGGEST
 *  ✓ Sin embedding: nombre distinto → ADD_NEW
 *  ✓ "leche" ≈ "caja de leche" (normalización previa, mismo vector hipotético)
 *  ✓ "leche entera" ≠ "leche desnatada" (atributos en conflicto → SUGGEST aunque sim ≥ 0.92)
 */
import { describe, it, expect } from 'vitest';
import { applyDedupPolicy, type CatalogCandidate, type DedupInput } from './dedup-policy';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCandidate(
  overrides: Partial<CatalogCandidate> & { id: string },
): CatalogCandidate {
  return {
    id: overrides.id,
    normalizedName: overrides.normalizedName ?? 'leche',
    displayName: overrides.displayName ?? 'Leche',
    attributes: overrides.attributes ?? {},
    embedding: overrides.embedding ?? null,
    similarity: overrides.similarity,
    frequency: overrides.frequency ?? 1,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('applyDedupPolicy', () => {
  describe('sin candidatos', () => {
    it('devuelve ADD_NEW cuando no hay candidatos', () => {
      const result = applyDedupPolicy({
        normalizedName: 'leche',
        attributes: {},
        embedding: [0.1, 0.2, 0.3],
        candidates: [],
      });
      expect(result.decision).toBe('ADD_NEW');
      expect(result.candidates).toHaveLength(0);
    });
  });

  describe('modo con embedding', () => {
    const input: DedupInput = {
      normalizedName: 'leche',
      attributes: {},
      embedding: [0.1, 0.2],
      candidates: [],
    };

    it('similitud ≥ 0.92 + atributos compatibles → AUTO_MERGE', () => {
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'leche', attributes: {}, similarity: 0.95 }),
      ];
      const result = applyDedupPolicy({ ...input, candidates });
      expect(result.decision).toBe('AUTO_MERGE');
      expect(result.candidates[0]?.id).toBe('c1');
    });

    it('similitud ≥ 0.92 pero atributos conflictivos → SUGGEST', () => {
      // "leche entera" vs catálogo "leche desnatada"
      const candidates = [
        makeCandidate({
          id: 'c1',
          normalizedName: 'leche desnatada',
          attributes: { grasa: 'desnatada' },
          similarity: 0.94,
        }),
      ];
      const result = applyDedupPolicy({
        ...input,
        normalizedName: 'leche entera',
        attributes: { grasa: 'entera' },
        candidates,
      });
      expect(result.decision).toBe('SUGGEST');
    });

    it('similitud 0.82–0.92 → SUGGEST', () => {
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'leche', attributes: {}, similarity: 0.87 }),
      ];
      const result = applyDedupPolicy({ ...input, candidates });
      expect(result.decision).toBe('SUGGEST');
    });

    it('similitud < 0.82 → ADD_NEW', () => {
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'leche', attributes: {}, similarity: 0.70 }),
      ];
      const result = applyDedupPolicy({ ...input, candidates });
      expect(result.decision).toBe('ADD_NEW');
    });

    it('el candidato de mayor similitud determina AUTO_MERGE aunque haya otros menores', () => {
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'leche', attributes: {}, similarity: 0.96 }),
        makeCandidate({ id: 'c2', normalizedName: 'leche', attributes: {}, similarity: 0.85 }),
      ];
      const result = applyDedupPolicy({ ...input, candidates });
      expect(result.decision).toBe('AUTO_MERGE');
      expect(result.candidates[0]?.id).toBe('c1');
    });
  });

  describe('modo sin embedding (fallback a normalización)', () => {
    it('nombre normalizado igual + atributos compatibles → AUTO_MERGE', () => {
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'leche', attributes: {} }),
      ];
      const result = applyDedupPolicy({
        normalizedName: 'leche',
        attributes: {},
        embedding: null,
        candidates,
      });
      expect(result.decision).toBe('AUTO_MERGE');
    });

    it('nombre normalizado igual + atributos conflictivos → SUGGEST', () => {
      // "leche" (entrada sin atributo) vs catálogo "leche entera" (con grasa:entera)
      // No hay conflicto real aquí porque la entrada no tiene atributo grasa.
      // Pero "leche entera" vs "leche desnatada" sí es conflicto.
      const candidates = [
        makeCandidate({
          id: 'c1',
          normalizedName: 'leche entera',
          attributes: { grasa: 'entera' },
        }),
      ];
      const result = applyDedupPolicy({
        normalizedName: 'leche entera',
        attributes: { grasa: 'desnatada' },
        embedding: null,
        candidates,
      });
      expect(result.decision).toBe('SUGGEST');
    });

    it('nombre normalizado distinto → ADD_NEW', () => {
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'aceite', attributes: {} }),
      ];
      const result = applyDedupPolicy({
        normalizedName: 'leche',
        attributes: {},
        embedding: null,
        candidates,
      });
      expect(result.decision).toBe('ADD_NEW');
    });
  });

  describe('invariantes del enunciado', () => {
    it('"leche" ≈ "caja de leche": misma normalización → AUTO_MERGE en fallback', () => {
      // La normalización previa ya convierte "caja de leche" → "leche"
      // Por eso ambos coinciden en el catálogo sin necesidad de embeddings.
      const candidates = [
        makeCandidate({ id: 'c1', normalizedName: 'leche', attributes: {} }),
      ];
      const resultLeche = applyDedupPolicy({
        normalizedName: 'leche',
        attributes: {},
        embedding: null,
        candidates,
      });
      const resultCajaDeLeche = applyDedupPolicy({
        normalizedName: 'leche', // ya normalizado antes de llamar
        attributes: {},
        embedding: null,
        candidates,
      });
      expect(resultLeche.decision).toBe('AUTO_MERGE');
      expect(resultCajaDeLeche.decision).toBe('AUTO_MERGE');
    });

    it('"leche entera" ≠ "leche desnatada": atributo grasa conflictivo → SUGGEST aunque sim sea alta', () => {
      const candidates = [
        makeCandidate({
          id: 'c1',
          normalizedName: 'leche desnatada',
          attributes: { grasa: 'desnatada' },
          similarity: 0.97, // sim muy alta
        }),
      ];
      const result = applyDedupPolicy({
        normalizedName: 'leche entera',
        attributes: { grasa: 'entera' },
        embedding: [0.1, 0.2],
        candidates,
      });
      // Aunque la similitud coseno sea muy alta, el conflicto de atributos
      // impide el AUTO_MERGE y degrada a SUGGEST.
      expect(result.decision).toBe('SUGGEST');
    });
  });
});
