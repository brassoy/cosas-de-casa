/**
 * Puerto de dominio para el catálogo de artículos por familia.
 *
 * Gestiona dedup + frecuencia. El adaptador usa pgvector para
 * la búsqueda por similitud coseno (family-scoped).
 */

export interface CatalogItemData {
  id: string;
  familyId: string;
  normalizedName: string;
  displayName: string;
  attributes: Record<string, string>;
  embedding: number[] | null;
  frequency: number;
  lastAddedAt: Date;
}

export interface FindSimilarOptions {
  familyId: string;
  embedding: number[];
  /** Número máximo de candidatos a devolver (por defecto 5). */
  limit?: number;
  /** Umbral mínimo de similitud (por defecto 0.82). */
  minSimilarity?: number;
}

export interface SimilarityCandidate {
  id: string;
  normalizedName: string;
  displayName: string;
  attributes: Record<string, string>;
  embedding: number[] | null;
  similarity: number;
  frequency: number;
}

export interface CatalogItemRepository {
  /** Busca candidatos por nombre normalizado (sin vector). */
  findByNormalizedName(
    familyId: string,
    normalizedName: string,
  ): Promise<CatalogItemData[]>;

  /**
   * Busca los N candidatos más similares por coseno (pgvector).
   * Solo se llama cuando hay embedding disponible.
   */
  findSimilar(options: FindSimilarOptions): Promise<SimilarityCandidate[]>;

  /** Upsert: crea o incrementa frecuencia del ítem en catálogo. */
  upsert(item: Omit<CatalogItemData, 'frequency' | 'lastAddedAt'>): Promise<CatalogItemData>;

  /** Devuelve los N ítems más frecuentes de una familia. */
  findFrequent(familyId: string, limit: number): Promise<CatalogItemData[]>;
}

export const CATALOG_ITEM_REPOSITORY = Symbol('CatalogItemRepository');
