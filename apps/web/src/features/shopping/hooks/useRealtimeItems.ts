/**
 * useRealtimeItems — suscripción Supabase Realtime a `shopping_items`.
 *
 * Al montar, abre un canal Postgres Changes filtrado por `list_id=eq.<listId>`.
 * Cada cambio (INSERT / UPDATE / DELETE) se mergea en Dexie para que useLiveQuery
 * repinte la UI en tiempo real.
 *
 * Estrategia de merge con el outbox (last-write-wins por updatedAt):
 *   - INSERT / UPDATE remotos: sólo se aplican si NO hay una entrada en el outbox
 *     con el mismo `id` en estado 'pending'. Si la hay, el cambio local es más
 *     reciente (el usuario lo acaba de hacer) y se ignora el evento remoto.
 *   - DELETE remotos: siempre se aplican (un borrado remoto gana sobre cualquier
 *     cambio local pendiente, ya que el ítem ya no existe en el servidor).
 *
 * Si Realtime no está disponible o la app está offline, la suscripción simplemente
 * no recibe eventos; la app sigue funcionando con Dexie + sync normal.
 */

import { useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { db } from '../offline/db';

// Forma del payload de postgres_changes para shopping_items.
interface RemoteItem {
  id: string;
  list_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  description: string | null;
  purchase_link: string | null;
  checked: boolean;
  updated_at: string;
  created_at: string;
}

/** Tipo mínimo del payload new/old que devuelve Supabase Realtime. */
type ItemPayload = RealtimePostgresChangesPayload<RemoteItem>;

async function hasPendingOutbox(itemId: string): Promise<boolean> {
  // Buscamos en el outbox entradas 'pending' que afecten a este ítem.
  const pending = await db.outbox
    .where('status')
    .equals('pending')
    .toArray();

  return pending.some((entry) => {
    const p = entry.payload as { itemId?: string; localId?: string };
    return p.itemId === itemId || p.localId === itemId;
  });
}

/** @internal Exportada para testing. No usar fuera de tests. */
export async function applyRealtimeChange(payload: ItemPayload): Promise<void> {
  const { eventType } = payload;

  if (eventType === 'DELETE') {
    // El old record puede tener la id si el Realtime está configurado para
    // enviar registros anteriores. Si no, no podemos hacer nada.
    const old = payload.old as Partial<RemoteItem>;
    if (old?.id) {
      await db.items.delete(old.id);
    }
    return;
  }

  const record = payload.new as RemoteItem;
  if (!record?.id) return;

  // No pisamos ítems que el usuario acaba de modificar (están en el outbox).
  if (await hasPendingOutbox(record.id)) return;

  // last-write-wins: comprobamos updatedAt.
  const local = await db.items.get(record.id);
  if (local && local.updatedAt >= record.updated_at) return;

  await db.items.put({
    id: record.id,
    listId: record.list_id,
    name: record.name,
    quantity: record.quantity !== null ? Number(record.quantity) : undefined,
    unit: record.unit ?? undefined,
    description: record.description ?? undefined,
    purchaseLink: record.purchase_link ?? undefined,
    checked: record.checked,
    updatedAt: record.updated_at,
    createdAt: record.created_at,
  });
}

export function useRealtimeItems(listId: string | undefined): void {
  useEffect(() => {
    if (!listId) return;

    let unsubscribed = false;

    const channel = supabase
      .channel(`shopping_items:list_id=eq.${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `list_id=eq.${listId}`,
        },
        (payload: ItemPayload) => {
          if (unsubscribed) return;
          void applyRealtimeChange(payload);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Degrada en silencio: la app sigue funcionando con Dexie + sync normal.
          console.warn('[realtime] Canal shopping_items no disponible:', listId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [listId]);
}
