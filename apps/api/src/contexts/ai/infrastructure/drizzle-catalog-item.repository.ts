/**
 * Adaptador Drizzle de CatalogItemRepository.
 *
 * Usa pgvector para la búsqueda por similitud coseno.
 * La búsqueda vectorial se hace con SQL raw porque drizzle-orm no
 * expone todavía un helper de alto nivel para <=> (coseno).
 */

import { desc, eq, sql } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { catalogItems } from '../../../db/schema';
import type {
  CatalogItemData,
  CatalogItemRepository,
  FindSimilarOptions,
  SimilarityCandidate,
} from '../domain/ports/catalog-item.repository';

/** Convierte el array de numbers al formato literal de pgvector: '[1,2,3]'. */
function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

type SimilarRow = {
  id: string;
  normalized_name: string;
  display_name: string;
  attributes: Record<string, string>;
  embedding: number[] | null;
  frequency: number;
  similarity: number;
};

type UpsertRow = {
  id: string;
  family_id: string;
  normalized_name: string;
  display_name: string;
  attributes: Record<string, string>;
  embedding: number[] | null;
  frequency: number;
  last_added_at: Date;
};

export class DrizzleCatalogItemRepository implements CatalogItemRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async findByNormalizedName(
    familyId: string,
    normalizedName: string,
  ): Promise<CatalogItemData[]> {
    const rows = await this.db
      .select()
      .from(catalogItems)
      .where(
        sql`${catalogItems.familyId} = ${familyId}
            AND ${catalogItems.normalizedName} = ${normalizedName}`,
      )
      .limit(10);

    return rows.map((r) => this.toData(r));
  }

  async findSimilar(options: FindSimilarOptions): Promise<SimilarityCandidate[]> {
    const { familyId, embedding, limit = 5, minSimilarity = 0.82 } = options;
    const vectorLiteral = toVectorLiteral(embedding);

    const result = await this.db.execute(
      sql`
        SELECT
          id,
          normalized_name,
          display_name,
          attributes,
          embedding,
          frequency,
          1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM catalog_items
        WHERE family_id = ${familyId}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${vectorLiteral}::vector) >= ${minSimilarity}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `,
    );

    const rows = (result as unknown as { rows: SimilarRow[] }).rows ?? (result as unknown as SimilarRow[]);

    return rows.map((row) => ({
      id: row.id,
      normalizedName: row.normalized_name,
      displayName: row.display_name,
      attributes: row.attributes ?? {},
      embedding: row.embedding,
      frequency: row.frequency,
      similarity: Number(row.similarity),
    }));
  }

  async upsert(
    item: Omit<CatalogItemData, 'frequency' | 'lastAddedAt'>,
  ): Promise<CatalogItemData> {
    const vectorLiteral = item.embedding ? toVectorLiteral(item.embedding) : null;
    const embeddingExpr = vectorLiteral
      ? sql`${vectorLiteral}::vector`
      : sql`NULL`;

    const result = await this.db.execute(
      sql`
        INSERT INTO catalog_items
          (id, family_id, normalized_name, display_name, attributes, embedding, frequency, last_added_at)
        VALUES (
          ${item.id},
          ${item.familyId},
          ${item.normalizedName},
          ${item.displayName},
          ${JSON.stringify(item.attributes)}::jsonb,
          ${embeddingExpr},
          1,
          NOW()
        )
        ON CONFLICT (family_id, normalized_name)
        DO UPDATE SET
          frequency      = catalog_items.frequency + 1,
          last_added_at  = NOW(),
          embedding      = COALESCE(${embeddingExpr}, catalog_items.embedding),
          display_name   = EXCLUDED.display_name,
          attributes     = EXCLUDED.attributes
        RETURNING *
      `,
    );

    const rows = (result as unknown as { rows: UpsertRow[] }).rows ?? (result as unknown as UpsertRow[]);
    const raw = rows[0];
    if (!raw) {
      throw new Error('upsert no devolvió ninguna fila');
    }

    return {
      id: raw.id,
      familyId: raw.family_id,
      normalizedName: raw.normalized_name,
      displayName: raw.display_name,
      attributes: raw.attributes ?? {},
      embedding: raw.embedding,
      frequency: raw.frequency,
      lastAddedAt: raw.last_added_at,
    };
  }

  async findFrequent(familyId: string, limit: number): Promise<CatalogItemData[]> {
    const rows = await this.db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.familyId, familyId))
      .orderBy(desc(catalogItems.frequency), desc(catalogItems.lastAddedAt))
      .limit(limit);

    return rows.map((r) => this.toData(r));
  }

  private toData(row: typeof catalogItems.$inferSelect): CatalogItemData {
    return {
      id: row.id,
      familyId: row.familyId,
      normalizedName: row.normalizedName,
      displayName: row.displayName,
      attributes: (row.attributes as Record<string, string>) ?? {},
      embedding: row.embedding as number[] | null,
      frequency: row.frequency,
      lastAddedAt: row.lastAddedAt,
    };
  }
}
