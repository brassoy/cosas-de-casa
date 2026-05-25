/**
 * Hooks de shopping offline-first.
 *
 * Las consultas leen de Dexie mediante useLiveQuery (reactivo, funciona offline).
 * Las mutaciones escriben PRIMERO en Dexie (UI actualiza al instante) y luego
 * encolan la operación en el outbox para que sync.ts la envíe a la API.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import type { ItemCommentDto } from '@cosasdecasa/contracts';
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
