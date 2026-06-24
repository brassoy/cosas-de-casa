import { Inject, Injectable } from '@nestjs/common';
import type { FridgeLocation } from '@cosasdecasa/contracts';
import {
  FRIDGE_ITEM_REPOSITORY,
  type FridgeItemRepository,
} from '../../fridge/domain/ports/fridge-item.repository';
import {
  EMBEDDING_PORT,
  type EmbeddingPort,
} from '../../ai/domain/ports/embedding.port';
import { normalizeItemName } from '../../ai/domain/item-normalizer';
import {
  RECIPE_REPOSITORY,
  type RecipeRepository,
} from '../domain/ports/recipe.repository';
import { RecipeNotFoundError } from '../domain/menu.errors';

/** Umbral de similitud coseno para considerar dos nombres "el mismo" producto. */
const SEMANTIC_THRESHOLD = 0.82;

/**
 * Palabras vacías que no aportan identidad al producto: preposiciones y
 * artículos. Se descartan antes de comparar conjuntos de palabras.
 */
const STOP_WORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'al',
  'a',
  'con',
  'y',
  'en',
]);

export type IngredientMatchType = 'normalized' | 'semantic' | 'missing';

export interface IngredientAvailabilityResult {
  name: string;
  available: boolean;
  foundAs: string | null;
  location: FridgeLocation | null;
  matchType: IngredientMatchType;
}

export interface CheckRecipeAvailabilityResult {
  recipeId: string;
  ingredients: IngredientAvailabilityResult[];
  missing: string[];
}

export interface CheckRecipeAvailabilityCommand {
  recipeId: string;
}

/** Producto del inventario ya pre-normalizado (cache para el cruce). */
interface InventoryEntry {
  name: string;
  normalized: string;
  /** Palabras significativas del nombre normalizado (sin stop-words). */
  words: Set<string>;
  location: FridgeLocation;
}

/** Descompone un nombre normalizado en palabras significativas. */
function significantWords(normalized: string): Set<string> {
  return new Set(
    normalized
      .split(/\s+/)
      .filter((w) => w.length > 0 && !STOP_WORDS.has(w)),
  );
}

/** ¿Es `a` un subconjunto no vacío de `b`? */
function isSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0) return false;
  for (const word of a) {
    if (!b.has(word)) return false;
  }
  return true;
}

/**
 * Match determinista entre el ingrediente y un producto del inventario.
 *
 * Cuadra si comparten el mismo conjunto de palabras significativas, o si uno
 * es subconjunto del otro (el nombre con modificadores contiene al genérico):
 *   - "patata cocida" {patata, cocida} ⊇ "patata" {patata} → cuadra
 *   - "aceite de oliva" {aceite, oliva} ⊇ "aceite" {aceite} → cuadra
 *   - "huevos"→"huevo" == "huevo" → cuadra
 */
function normalizedMatch(
  ingredientWords: Set<string>,
  entryWords: Set<string>,
): boolean {
  return (
    isSubset(entryWords, ingredientWords) ||
    isSubset(ingredientWords, entryWords)
  );
}

/**
 * Caso de uso CENTRAL: comprobar qué ingredientes de una receta están en el
 * inventario (nevera + congelador + despensa, EXCLUYENDO los tirados DISCARDED).
 *
 * Matching en dos niveles, de barato a caro:
 *   1. Normalización determinista (singular ES, sin ruido) → matchType 'normalized'.
 *   2. Similitud semántica por embeddings (coseno >= 0.82) → matchType 'semantic'.
 *
 * Degradación (ADR 0014): si el modelo de embeddings no está disponible
 * (`embed` devuelve null), se salta el nivel semántico y se usa solo el
 * determinista. Nunca rompe.
 */
@Injectable()
export class CheckRecipeAvailabilityUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly recipes: RecipeRepository,
    @Inject(FRIDGE_ITEM_REPOSITORY) private readonly fridge: FridgeItemRepository,
    @Inject(EMBEDDING_PORT) private readonly embeddings: EmbeddingPort,
  ) {}

  async execute(
    command: CheckRecipeAvailabilityCommand,
  ): Promise<CheckRecipeAvailabilityResult> {
    const recipe = await this.recipes.findById(command.recipeId);
    if (!recipe) {
      throw new RecipeNotFoundError();
    }

    // Inventario disponible (todo menos lo tirado), pre-normalizado.
    const items = await this.fridge.findByFamily(recipe.familyId);
    const inventory: InventoryEntry[] = items
      .filter((item) => item.location !== 'DISCARDED')
      .map((item) => {
        const normalized = normalizeItemName(item.name).normalized;
        return {
          name: item.name,
          normalized,
          words: significantWords(normalized),
          location: item.location,
        };
      });

    // Cache de embeddings del inventario (se calculan perezosamente solo si hace
    // falta caer al nivel semántico, y una sola vez por sesión del caso de uso).
    let inventoryEmbeddings: (number[] | null)[] | null = null;

    const results: IngredientAvailabilityResult[] = [];

    for (const ingredient of recipe.ingredients) {
      // ── Nivel 1: normalización determinista (con subconjunto de palabras) ─
      const ingredientWords = significantWords(
        normalizeItemName(ingredient).normalized,
      );
      const match = inventory.find((entry) =>
        normalizedMatch(ingredientWords, entry.words),
      );
      if (match) {
        results.push({
          name: ingredient,
          available: true,
          foundAs: match.name,
          location: match.location,
          matchType: 'normalized',
        });
        continue;
      }

      // ── Nivel 2: similitud semántica por embeddings ──────────────────────
      const ingredientEmbedding = await this.embeddings.embed(ingredient);
      if (ingredientEmbedding && inventory.length > 0) {
        if (inventoryEmbeddings === null) {
          inventoryEmbeddings = await Promise.all(
            inventory.map((entry) => this.embeddings.embed(entry.name)),
          );
        }

        let best: { entry: InventoryEntry; similarity: number } | null = null;
        for (let i = 0; i < inventory.length; i++) {
          const candidateEmbedding = inventoryEmbeddings[i];
          if (!candidateEmbedding) continue;
          const similarity = cosineSimilarity(
            ingredientEmbedding,
            candidateEmbedding,
          );
          if (similarity >= SEMANTIC_THRESHOLD && (!best || similarity > best.similarity)) {
            best = { entry: inventory[i] as InventoryEntry, similarity };
          }
        }

        if (best) {
          results.push({
            name: ingredient,
            available: true,
            foundAs: best.entry.name,
            location: best.entry.location,
            matchType: 'semantic',
          });
          continue;
        }
      }

      // ── No encontrado ─────────────────────────────────────────────────────
      results.push({
        name: ingredient,
        available: false,
        foundAs: null,
        location: null,
        matchType: 'missing',
      });
    }

    return {
      recipeId: recipe.id,
      ingredients: results,
      missing: results.filter((r) => !r.available).map((r) => r.name),
    };
  }
}

/**
 * Similitud coseno de dos vectores: dot(a, b) / (||a|| · ||b||).
 * Devuelve 0 si algún vector es nulo (norma cero).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const ai = a[i] as number;
    const bi = b[i] as number;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
