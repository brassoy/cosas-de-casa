/**
 * Motor de sincronización offline-first.
 *
 * Responsabilidades:
 *  1. seedFromApi — al arrancar/reconectar, pide a la API los datos frescos
 *     y puebla Dexie. La UI lee SIEMPRE de Dexie; este seed es transparente.
 *  2. enqueue — encola una operación en `outbox` para ser enviada cuando haya
 *     conexión.
 *  3. replayOutbox — envía el outbox en orden (seq ASC) con backoff exponencial.
 *  4. Listener 'online' global — lanza replayOutbox automáticamente.
 */

import { api } from '@/shared/lib/api';
import type { ListWithItemsDto, ShoppingListSummaryDto } from '@cosasdecasa/contracts';
import { db, type OutboxEntry, type OutboxOpType } from './db';

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

// ── 1. Seed desde la API ──────────────────────────────────────────────────────

export async function seedFromApi(familyId: string): Promise<void> {
  if (!navigator.onLine) return;

  try {
    // El listado devuelve RESÚMENES (sin items). Los items se siembran al abrir
    // el detalle de una lista (seedListDetail).
    const lists = await api.get<ShoppingListSummaryDto[]>(`/families/${familyId}/lists`);

    await db.transaction('rw', db.lists, async () => {
      // Sustituimos sólo las listas de ESTA familia (otras familias quedan intactas)
      const existingIds = await db.lists.where('familyId').equals(familyId).primaryKeys();
      await db.lists.bulkDelete(existingIds as string[]);

      for (const list of lists) {
        await db.lists.put({
          id: list.id,
          familyId: list.familyId,
          name: list.name,
          type: list.type,
          updatedAt: list.updatedAt,
          createdAt: list.createdAt,
        });
      }
    });
  } catch (err) {
    // Seed fallido: Dexie conserva los datos previos. No es bloqueante.
    console.warn('[sync] seedFromApi falló:', err);
  }
}

export async function seedListDetail(listId: string): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const list = await api.get<ListWithItemsDto>(`/lists/${listId}`);

    await db.transaction('rw', db.lists, db.items, async () => {
      await db.lists.put({
        id: list.id,
        familyId: list.familyId,
        name: list.name,
        type: list.type,
        updatedAt: list.updatedAt,
        createdAt: list.createdAt,
      });

      // Reemplazamos items de esta lista
      const existingItemIds = await db.items.where('listId').equals(listId).primaryKeys();
      await db.items.bulkDelete(existingItemIds as string[]);

      for (const item of list.items) {
        await db.items.put({
          id: item.id,
          listId: list.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
          purchaseLink: item.purchaseLink,
          checked: item.checked,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        });
      }
    });
  } catch (err) {
    console.warn('[sync] seedListDetail falló:', err);
  }
}

// ── 2. Encolar operación ──────────────────────────────────────────────────────

export async function enqueue(
  type: OutboxOpType,
  payload: Record<string, unknown>,
): Promise<void> {
  const entry: OutboxEntry = {
    type,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: now(),
  };
  await db.outbox.add(entry);
  // Intentamos replay inmediato si estamos online
  if (navigator.onLine) {
    void replayOutbox();
  }
}

// ── 3. Replay del outbox ──────────────────────────────────────────────────────

let replayInFlight = false;

export async function replayOutbox(): Promise<void> {
  if (replayInFlight) return;
  replayInFlight = true;

  try {
    const pending = await db.outbox
      .where('status')
      .equals('pending')
      .sortBy('seq');

    for (const entry of pending) {
      if (!navigator.onLine) break;

      try {
        await dispatchOp(entry);
        await db.outbox.delete(entry.seq!);
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;

        if (status === 409 || status === 404) {
          // Conflicto: marcamos la entrada y reconciliamos con re-fetch
          await db.outbox.update(entry.seq!, { status: 'conflict' });
          await reconcileConflict(entry);
        } else {
          // Error transitorio: backoff exponencial (stop replay en este ciclo)
          await db.outbox.update(entry.seq!, { attempts: entry.attempts + 1 });
          break;
        }
      }
    }
  } finally {
    replayInFlight = false;
  }
}

async function dispatchOp(entry: OutboxEntry): Promise<void> {
  const { type, payload } = entry;

  switch (type) {
    case 'createList':
      await api.post<ListWithItemsDto>(
        `/families/${payload.familyId as string}/lists`,
        { name: payload.name },
      );
      break;

    case 'addItem':
      // Los adds del outbox son operaciones ya confirmadas por el usuario
      // (offline o error de red). Se envían siempre con forceAdd=true para
      // que el servidor cree el ítem sin re-disparar el diálogo de dedup.
      await api.post<unknown>(
        `/lists/${payload.listId as string}/items`,
        {
          name: payload.name,
          quantity: payload.quantity,
          unit: payload.unit,
          description: payload.description,
          purchaseLink: payload.purchaseLink,
          forceAdd: true,
        },
      );
      break;

    case 'toggleItem':
      await api.patch<unknown>(`/items/${payload.itemId as string}`, {
        checked: payload.checked,
      });
      break;

    case 'updateItem':
      await api.patch<unknown>(`/items/${payload.itemId as string}`, payload.data);
      break;

    case 'deleteItem':
      await api.delete<unknown>(`/items/${payload.itemId as string}`);
      break;

    case 'addComment':
      await api.post<unknown>(`/items/${payload.itemId as string}/comments`, {
        body: payload.body,
      });
      break;

    default:
      throw new Error(`[sync] Operación desconocida: ${String(type)}`);
  }
}

async function reconcileConflict(entry: OutboxEntry): Promise<void> {
  try {
    // Re-fetch la lista afectada para que Dexie refleje el estado real del servidor
    const listId = (entry.payload.listId ?? entry.payload.listId) as string | undefined;
    const itemId = entry.payload.itemId as string | undefined;

    if (itemId) {
      // Necesitamos saber a qué lista pertenece el item
      const local = await db.items.get(itemId);
      if (local) await seedListDetail(local.listId);
    } else if (listId) {
      await seedListDetail(listId);
    }
  } catch {
    // Reconciliación fallida: la UI mostrará el dato local hasta el próximo sync
  }
}

// ── 4. Listener global 'online' ───────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void replayOutbox();
  });
}
