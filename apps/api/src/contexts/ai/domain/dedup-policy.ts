/**
 * Política de deduplicación semántica.
 *
 * Combina similitud coseno (pgvector, family-scoped) con
 * compatibilidad de atributos para decidir:
 *   - ADD_NEW   → sin solapamiento suficiente.
 *   - AUTO_MERGE → coincidencia muy alta (≥ 0.92) + atributos compatibles.
 *   - SUGGEST   → coincidencia media (0.82–0.92) o atributos distintos.
 *
 * Si no hay embedding disponible, usa solo normalización + atributos:
 *   - normalized_name idéntico + atributos compatibles → AUTO_MERGE.
 *   - normalized_name idéntico + atributos conflictivos → SUGGEST.
 *   - nombres distintos → ADD_NEW.
 *
 * Garantías:
 *   ✓ "leche" ≈ "caja de leche" (normalización elimina el ruido)
 *   ✓ "leche entera" ≠ "leche desnatada" (atributo grasa en conflicto → SUGGEST)
 */

import type { DedupDecision } from '@cosasdecasa/contracts';

export interface CatalogCandidate {
  id: string;
  normalizedName: string;
  displayName: string;
  attributes: Record<string, string>;
  embedding: number[] | null;
  similarity?: number; // calculado por pgvector (coseno)
  frequency: number;
}

export interface DedupInput {
  normalizedName: string;
  attributes: Record<string, string>;
  embedding: number[] | null;
  candidates: CatalogCandidate[];
}

export interface DedupResult {
  decision: DedupDecision;
  candidates: CatalogCandidate[];
}

// ── Umbrales de similitud coseno ─────────────────────────────────────────────

const THRESHOLD_AUTO_MERGE = 0.92;
const THRESHOLD_SUGGEST = 0.82;

// ── Compatibilidad de atributos ──────────────────────────────────────────────

/**
 * Comprueba si dos mapas de atributos son compatibles.
 *
 * Dos atributos son CONFLICTIVOS si tienen la misma clave con valores distintos.
 * Por ejemplo: { grasa: 'entera' } vs { grasa: 'desnatada' } → conflicto.
 *
 * Claves ausentes en uno de los lados NO cuentan como conflicto
 * (la ausencia de atributo significa "no especificado").
 */
function areAttributesCompatible(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  for (const key of Object.keys(a)) {
    if (b[key] !== undefined && b[key] !== a[key]) {
      return false; // conflicto
    }
  }
  for (const key of Object.keys(b)) {
    if (a[key] !== undefined && a[key] !== b[key]) {
      return false; // conflicto
    }
  }
  return true;
}

// ── Política principal ───────────────────────────────────────────────────────

export function applyDedupPolicy(input: DedupInput): DedupResult {
  const { normalizedName, attributes, embedding, candidates } = input;

  if (candidates.length === 0) {
    return { decision: 'ADD_NEW', candidates: [] };
  }

  // ── Caso con embeddings ──────────────────────────────────────────────────

  if (embedding !== null) {
    // Los candidatos vienen pre-ordenados por similitud (desc) desde pgvector.
    const strongCandidates: CatalogCandidate[] = [];
    const suggestCandidates: CatalogCandidate[] = [];

    for (const candidate of candidates) {
      const sim = candidate.similarity ?? 0;
      if (sim >= THRESHOLD_AUTO_MERGE) {
        if (areAttributesCompatible(attributes, candidate.attributes)) {
          // Coincidencia fuerte + atributos compatibles → merge automático
          strongCandidates.push(candidate);
        } else {
          // Coincidencia fuerte pero atributos conflictivos → DISTINCT, no merge
          // (p. ej. leche entera ≠ leche desnatada aunque los vectores sean cercanos)
          suggestCandidates.push(candidate);
        }
      } else if (sim >= THRESHOLD_SUGGEST) {
        suggestCandidates.push(candidate);
      }
    }

    if (strongCandidates.length > 0) {
      return { decision: 'AUTO_MERGE', candidates: strongCandidates };
    }
    if (suggestCandidates.length > 0) {
      return { decision: 'SUGGEST', candidates: suggestCandidates };
    }
    return { decision: 'ADD_NEW', candidates: [] };
  }

  // ── Caso sin embedding: solo normalización + atributos ───────────────────

  const exactMatches = candidates.filter(
    (c) => c.normalizedName === normalizedName,
  );

  if (exactMatches.length === 0) {
    return { decision: 'ADD_NEW', candidates: [] };
  }

  const compatibleMatches = exactMatches.filter((c) =>
    areAttributesCompatible(attributes, c.attributes),
  );

  if (compatibleMatches.length > 0) {
    return { decision: 'AUTO_MERGE', candidates: compatibleMatches };
  }

  // Hay coincidencia de nombre pero atributos conflictivos → sugerir
  return { decision: 'SUGGEST', candidates: exactMatches };
}
