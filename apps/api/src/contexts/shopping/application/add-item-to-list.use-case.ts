import { Inject, Injectable } from '@nestjs/common';
import type { AddItemDecision, DedupCandidateDto } from '@cosasdecasa/contracts';
import { ShoppingItem } from '../domain/shopping-list';
import {
  SHOPPING_ITEM_REPOSITORY,
  type ShoppingItemRepository,
} from '../domain/ports/shopping-item.repository';
import { normalizeItemNameForMatch } from '../domain/item-name';
import { UpsertCatalogItemUseCase } from '../../ai/application/upsert-catalog-item.use-case';
import { AddItemUseCase } from './add-item.use-case';

/**
 * Comando para añadir un artículo a una lista pasando por el flujo completo
 * de deduplicación. Incluye `forceAdd` para que el cliente confirme la adición
 * cuando el sistema sugiere un posible duplicado.
 */
export interface AddItemToListCommand {
  listId: string;
  familyId: string;
  actingUserId: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  description?: string | null;
  purchaseLink?: string | null;
  forceAdd?: boolean;
}

/**
 * Resultado de aplicación del flujo de añadir ítem.
 *
 * - `decision` refleja la decisión de dedup que tomó el sistema.
 * - `item` solo está presente cuando el ítem se crea efectivamente.
 * - `candidates` lista los posibles duplicados encontrados (si los hay).
 */
export interface AddItemToListResult {
  decision: AddItemDecision;
  item?: ShoppingItem;
  candidates?: DedupCandidateDto[];
}

/**
 * Caso de uso orquestador: añade un artículo a una lista avisando de duplicados
 * y manteniendo el catálogo de la familia actualizado.
 *
 * Decisión de producto: el aviso "¿Ya lo tienes?" (SUGGEST) mira SOLO la lista
 * actual — salta únicamente si existe un ítem PENDIENTE (no comprado) con el
 * mismo nombre normalizado. El catálogo histórico de la familia (contexto ai)
 * NO se consulta para decidir: nunca se limpia y hacía saltar el aviso incluso
 * con la lista vacía. El catálogo se sigue alimentando (upsert fire-and-forget)
 * para frecuentes y otros flujos.
 *
 * Flujo:
 *   1. Sin `forceAdd`: busca en la lista un ítem pendiente con el mismo nombre
 *      normalizado → si existe, devuelve SUGGEST con los candidatos SIN crear.
 *   2. Sin duplicado pendiente, o con `forceAdd=true` → crea el ítem.
 *   3. Actualiza el catálogo de la familia (incrementa frecuencia o lo crea).
 *
 * La existencia de la lista la valida {@link AddItemUseCase} al crear el ítem;
 * el `familyId` lo resuelve el guard/controller a partir de la lista.
 */
@Injectable()
export class AddItemToListUseCase {
  constructor(
    @Inject(SHOPPING_ITEM_REPOSITORY)
    private readonly items: ShoppingItemRepository,
    private readonly addItem: AddItemUseCase,
    private readonly upsertCatalog: UpsertCatalogItemUseCase,
  ) {}

  async execute(command: AddItemToListCommand): Promise<AddItemToListResult> {
    // Dedup contra la lista actual: solo ítems PENDIENTES (checked=false).
    if (!command.forceAdd) {
      const normalized = normalizeItemNameForMatch(command.name);
      const existing = await this.items.findByList(command.listId);
      const pendingDuplicates = existing.filter(
        (item) => !item.checked && normalizeItemNameForMatch(item.name) === normalized,
      );

      if (pendingDuplicates.length > 0) {
        return {
          decision: 'SUGGEST',
          candidates: pendingDuplicates.map(
            (item): DedupCandidateDto => ({
              // Mantiene el contrato DedupCandidateDto: aquí el candidato es un
              // ítem de la lista (no del catálogo), con coincidencia exacta.
              catalogItemId: item.id,
              normalizedName: normalizeItemNameForMatch(item.name),
              displayName: item.name,
              similarity: 1,
              frequency: 1,
            }),
          ),
        };
      }
    }

    // Sin duplicado pendiente, o adición confirmada por el cliente (forceAdd=true).
    const item = await this.addItem.execute({
      listId: command.listId,
      actingUserId: command.actingUserId,
      name: command.name,
      quantity: command.quantity,
      unit: command.unit,
      description: command.description,
      purchaseLink: command.purchaseLink,
    });

    // Actualizamos el catálogo de la familia (incrementa frecuencia o crea).
    // Se hace de forma fire-and-forget para no bloquear la respuesta; si falla
    // no queremos impedir que el ítem se haya añadido a la lista.
    void this.upsertCatalog
      .execute({ familyId: command.familyId, displayName: command.name })
      .catch((err: unknown) => {
        // Log silencioso: el ítem ya fue añadido; solo el catálogo queda
        // desactualizado.
        console.error('[shopping] upsertCatalog falló (no bloqueante):', err);
      });

    // El ítem se añade como nuevo (sin duplicado pendiente, o adición confirmada
    // tras una sugerencia). Nunca devolvemos AUTO_MERGE: no hay fusión automática.
    return {
      decision: 'ADD_NEW',
      item,
    };
  }
}
