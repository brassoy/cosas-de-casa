import { Injectable } from '@nestjs/common';
import type { AddItemDecision, DedupCandidateDto } from '@cosasdecasa/contracts';
import { ShoppingItem } from '../domain/shopping-list';
import { DedupCheckUseCase } from '../../ai/application/dedup-check.use-case';
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
 * Caso de uso orquestador: añade un artículo a una lista aplicando el dedup
 * semántico y manteniendo el catálogo de la familia actualizado.
 *
 * Encapsula el flujo que antes vivía en el controller:
 *   1. Dedup semántico (no lanza; solo decide) acotado a la familia.
 *   2. Decisión:
 *      - SUGGEST sin `forceAdd` → devuelve los candidatos SIN crear el ítem.
 *      - ADD_NEW, AUTO_MERGE o `forceAdd=true` → crea el ítem en la lista.
 *   3. Actualiza el catálogo de la familia (incrementa frecuencia o lo crea).
 *
 * La existencia de la lista la valida {@link AddItemUseCase} al crear el ítem;
 * el `familyId` lo resuelve el guard/controller a partir de la lista.
 */
@Injectable()
export class AddItemToListUseCase {
  constructor(
    private readonly dedupCheck: DedupCheckUseCase,
    private readonly addItem: AddItemUseCase,
    private readonly upsertCatalog: UpsertCatalogItemUseCase,
  ) {}

  async execute(command: AddItemToListCommand): Promise<AddItemToListResult> {
    // Dedup semántico (no lanza; solo decide).
    const dedupResult = await this.dedupCheck.execute({
      familyId: command.familyId,
      name: command.name,
    });

    const candidates =
      dedupResult.candidates.length > 0 ? dedupResult.candidates : undefined;

    // SUGGEST y AUTO_MERGE indican un duplicado (probable o claro). La fusión
    // automática NO está implementada, así que AMBOS piden confirmación al
    // usuario en vez de crear una línea duplicada en silencio. Solo se añade si
    // el cliente confirma explícitamente con `forceAdd`.
    const isPossibleDuplicate =
      dedupResult.decision === 'SUGGEST' || dedupResult.decision === 'AUTO_MERGE';
    if (isPossibleDuplicate && !command.forceAdd) {
      return {
        decision: 'SUGGEST',
        candidates,
      };
    }

    // ADD_NEW, o adición confirmada por el cliente (forceAdd=true) → creamos el ítem.
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

    // El ítem se añade como nuevo (ADD_NEW directo, o adición confirmada tras una
    // sugerencia). Nunca devolvemos AUTO_MERGE: la fusión automática no se realiza.
    return {
      decision: 'ADD_NEW',
      item,
      candidates,
    };
  }
}
