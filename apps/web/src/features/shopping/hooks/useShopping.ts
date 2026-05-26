/**
 * Hooks de shopping offline-first.
 *
 * Las consultas leen de Dexie mediante useLiveQuery (reactivo, funciona offline).
 * Las mutaciones escriben PRIMERO en Dexie (UI actualiza al instante) y luego
 * encolan la operación en el outbox para que sync.ts la envíe a la API.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useCallback, useState } from 'react';
import type {
  AddItemResultDto,
  DedupCandidateDto,
  ItemCommentDto,
} from '@cosasdecasa/contracts';
import { api } from '@/shared/lib/api';
import { db } from '../offline/db';
import { seedFromApi, seedListDetail, enqueue } from '../offline/sync';

export type { ItemCommentDto };

// ── Listas de la familia ──────────────────────────────────────────────────────

export function useShoppingLists(familyId: string | undefined) {
  // Seed inicial desde la API
  useEffect(() => {
    if (familyId) void seedFromApi(familyId);
  }, [familyId]);

  const lists = useLiveQuery(
    () => (familyId ? db.lists.where('familyId').equals(familyId).toArray() : []),
    [familyId],
  );

  return { lists: lists ?? [], loading: lists === undefined };
}

// ── Detalle de una lista ──────────────────────────────────────────────────────

export function useShoppingListDetail(listId: string | undefined) {
  useEffect(() => {
    if (listId) void seedListDetail(listId);
  }, [listId]);

  const list = useLiveQuery(
    () => (listId ? db.lists.get(listId) : undefined),
    [listId],
  );

  const items = useLiveQuery(
    () => (listId ? db.items.where('listId').equals(listId).toArray() : []),
    [listId],
  );

  return {
    list: list ?? null,
    items: items ?? [],
    loading: list === undefined && items === undefined,
  };
}

// ── Ítem individual ───────────────────────────────────────────────────────────

export function useShoppingItem(itemId: string | undefined) {
  const item = useLiveQuery(
    () => (itemId ? db.items.get(itemId) : undefined),
    [itemId],
  );

  return { item: item ?? null };
}

// ── Comentarios de un ítem ────────────────────────────────────────────────────

export function useItemComments(itemId: string | undefined) {
  const comments = useLiveQuery(
    () => (itemId ? db.comments.where('itemId').equals(itemId).sortBy('createdAt') : []),
    [itemId],
  );

  return { comments: comments ?? [] };
}

// ── Mutaciones ────────────────────────────────────────────────────────────────

export function useCreateList() {
  async function createList(familyId: string, name: string) {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    // Escritura optimista en Dexie
    await db.lists.put({
      id,
      familyId,
      name,
      type: 'CUSTOM',
      updatedAt: ts,
      createdAt: ts,
    });

    // Encolar para la API
    await enqueue('createList', { familyId, name, localId: id });
  }

  return { createList };
}

export function useAddItem() {
  async function addItem(
    listId: string,
    data: {
      name: string;
      quantity?: number;
      unit?: string;
      description?: string;
      purchaseLink?: string;
    },
  ) {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    await db.items.put({
      id,
      listId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      description: data.description,
      purchaseLink: data.purchaseLink,
      checked: false,
      updatedAt: ts,
      createdAt: ts,
    });

    await enqueue('addItem', { listId, ...data, localId: id });
  }

  return { addItem };
}

export function useToggleItem() {
  async function toggleItem(itemId: string, checked: boolean) {
    const ts = new Date().toISOString();

    // Optimista: actualiza Dexie antes de ir a la red
    await db.items.update(itemId, { checked, updatedAt: ts });

    await enqueue('toggleItem', { itemId, checked });
  }

  return { toggleItem };
}

export function useDeleteItem() {
  async function deleteItem(itemId: string) {
    await db.items.delete(itemId);
    await enqueue('deleteItem', { itemId });
  }

  return { deleteItem };
}

export function useAddComment(itemId: string) {
  async function addComment(body: string, authorId: string, authorName: string) {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    await db.comments.put({ id, itemId, authorId, authorName, body, createdAt: ts });

    await enqueue('addComment', { itemId, body });
  }

  return { addComment };
}

// ── Añadir ítem con gestión de deduplicación ──────────────────────────────────

/**
 * El endpoint POST /lists/:listId/items devuelve AddItemResultDto del contrato:
 *   { decision: AddItemDecision; item: ShoppingItemDto; candidates?: DedupCandidateDto[] }
 *
 * - ADD_NEW: ítem creado sin conflicto.
 * - AUTO_MERGE: backend fusionó automáticamente; item contiene el ítem actualizado.
 * - SUGGEST: hay candidatos similares; el frontend debe confirmar con el usuario.
 *
 * Cuando el backend devuelve SUGGEST, la respuesta queda en `pendingDedup` hasta
 * que el usuario confirma o cancela. Si confirma, se vuelve a llamar al endpoint
 * con `{ ...data, forceAdd: true }` para forzar la inserción.
 */

/** Re-exportamos el tipo del contrato para consumidores del hook. */
export type { AddItemResultDto, DedupCandidateDto };

export interface DedupState {
  listId: string;
  itemData: {
    name: string;
    quantity?: number;
    unit?: string;
    description?: string;
    purchaseLink?: string;
  };
  existingName: string;
}

export function useAddItemWithDedup() {
  const [dedupState, setDedupState] = useState<DedupState | null>(null);
  const [autoMergeMessage, setAutoMergeMessage] = useState<string | null>(null);

  const addItemWithDedup = useCallback(
    async (
      listId: string,
      data: {
        name: string;
        quantity?: number;
        unit?: string;
        description?: string;
        purchaseLink?: string;
      },
      opts: { forceAdd?: boolean } = {},
    ): Promise<{ needsConfirmation: boolean }> => {
      // Escritura optimista en Dexie (sólo si vamos a añadir de verdad)
      const localId = crypto.randomUUID();
      const ts = new Date().toISOString();

      if (!navigator.onLine || opts.forceAdd) {
        // Offline o force: escritura local directa, sin esperar decisión de la API.
        await db.items.put({
          id: localId,
          listId,
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          description: data.description,
          purchaseLink: data.purchaseLink,
          checked: false,
          updatedAt: ts,
          createdAt: ts,
        });
        await enqueue('addItem', { listId, ...data, localId });
        return { needsConfirmation: false };
      }

      // Online: llamamos al endpoint y gestionamos la decisión de dedup.
      try {
        const response = await api.post<AddItemResultDto>(
          `/lists/${listId}/items`,
          opts.forceAdd ? { ...data, forceAdd: true } : data,
        );

        if (response.decision === 'SUGGEST' && response.candidates && response.candidates.length > 0) {
          // No escribimos en Dexie todavía; esperamos confirmación del usuario.
          setDedupState({
            listId,
            itemData: data,
            existingName: response.candidates[0]!.displayName,
          });
          return { needsConfirmation: true };
        }

        if (response.decision === 'AUTO_MERGE') {
          // El backend fusionó; actualizamos Dexie con el ítem resultante.
          await db.items.put({
            id: response.item.id,
            listId,
            name: response.item.name,
            quantity: response.item.quantity,
            unit: response.item.unit,
            description: response.item.description,
            purchaseLink: response.item.purchaseLink,
            checked: response.item.checked,
            updatedAt: response.item.updatedAt,
            createdAt: response.item.createdAt,
          });
          setAutoMergeMessage(`"${data.name}" se ha fusionado con un artículo existente.`);
          setTimeout(() => setAutoMergeMessage(null), 3000);
          return { needsConfirmation: false };
        }

        // ADD_NEW: escribimos el ítem del servidor en Dexie.
        await db.items.put({
          id: response.item.id,
          listId,
          name: response.item.name,
          quantity: response.item.quantity,
          unit: response.item.unit,
          description: response.item.description,
          purchaseLink: response.item.purchaseLink,
          checked: response.item.checked,
          updatedAt: response.item.updatedAt,
          createdAt: response.item.createdAt,
        });

        return { needsConfirmation: false };
      } catch {
        // Error de red: caemos al path offline (optimistic write + outbox).
        await db.items.put({
          id: localId,
          listId,
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          description: data.description,
          purchaseLink: data.purchaseLink,
          checked: false,
          updatedAt: ts,
          createdAt: ts,
        });
        await enqueue('addItem', { listId, ...data, localId });
        return { needsConfirmation: false };
      }
    },
    [],
  );

  async function confirmDedup() {
    if (!dedupState) return;
    const { listId, itemData } = dedupState;
    setDedupState(null);
    await addItemWithDedup(listId, itemData, { forceAdd: true });
  }

  function cancelDedup() {
    setDedupState(null);
  }

  return {
    addItemWithDedup,
    dedupState,
    confirmDedup,
    cancelDedup,
    autoMergeMessage,
  };
}
