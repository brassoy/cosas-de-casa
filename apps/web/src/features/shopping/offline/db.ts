import Dexie, { type EntityTable } from 'dexie';
import type { ListType } from '@cosasdecasa/contracts';

// ── Tipos locales de la BD Dexie ──────────────────────────────────────────────

export interface LocalList {
  id: string;
  familyId: string;
  name: string;
  type: ListType;
  updatedAt: string;
  createdAt: string;
}

export interface LocalItem {
  id: string;
  listId: string;
  name: string;
  quantity?: number;
  unit?: string;
  description?: string;
  purchaseLink?: string;
  checked: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface LocalComment {
  id: string;
  itemId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// ── Outbox ────────────────────────────────────────────────────────────────────

export type OutboxOpType =
  | 'createList'
  | 'addItem'
  | 'toggleItem'
  | 'updateItem'
  | 'deleteItem'
  | 'addComment';

export type OutboxStatus = 'pending' | 'conflict';

export interface OutboxEntry {
  /** Auto-increment — determina el orden de replay. */
  seq?: number;
  type: OutboxOpType;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  /** Número de intentos fallidos. */
  attempts: number;
  createdAt: string;
}

// ── Clase Dexie ───────────────────────────────────────────────────────────────

class CosasDeCasaDB extends Dexie {
  lists!: EntityTable<LocalList, 'id'>;
  items!: EntityTable<LocalItem, 'id'>;
  comments!: EntityTable<LocalComment, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'seq'>;

  constructor() {
    super('cosasdecasa');

    this.version(1).stores({
      lists: 'id, familyId',
      items: 'id, listId, checked',
      comments: 'id, itemId',
      outbox: '++seq, status',
    });
  }
}

export const db = new CosasDeCasaDB();
