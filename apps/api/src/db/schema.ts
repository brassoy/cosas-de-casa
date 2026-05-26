import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

/**
 * Esquema de persistencia (Drizzle / Postgres).
 *
 * Vive en infraestructura: el dominio NO lo importa. Los mappers de los repos
 * traducen entre estas filas y los agregados de dominio.
 *
 * Convención: tablas y columnas en snake_case.
 */

// ── Enumerados ───────────────────────────────────────────────────────────────

export const membershipRoleEnum = pgEnum('membership_role', ['OWNER', 'MEMBER']);
export const joinPinStatusEnum = pgEnum('join_pin_status', ['ACTIVE', 'CONSUMED', 'REVOKED']);

// ── app_users ────────────────────────────────────────────────────────────────
// El id coincide con el uid de Supabase Auth (claim `sub` del JWT). Se aprovisiona
// "just-in-time" desde los claims en cada petición autenticada (upsert).

export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── families ─────────────────────────────────────────────────────────────────

export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => appUsers.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── memberships ──────────────────────────────────────────────────────────────

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Un usuario no puede estar dos veces en la misma familia.
    unique('memberships_family_user_unique').on(table.familyId, table.userId),
    index('memberships_user_idx').on(table.userId),
  ],
);

// ── join_pins ────────────────────────────────────────────────────────────────
// Solo se persiste el hash (scrypt) del código, nunca el código en claro.

export const joinPins = pgTable(
  'join_pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    status: joinPinStatusEnum('status').notNull().default('ACTIVE'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    consumedBy: uuid('consumed_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    // Garantía a nivel de BD: como mucho UN PIN ACTIVE por familia (índice único parcial).
    uniqueIndex('join_pins_one_active_per_family')
      .on(table.familyId)
      .where(sql`${table.status} = 'ACTIVE'`),
    // Búsqueda del PIN activo por hash (consumo atómico).
    index('join_pins_active_hash_idx')
      .on(table.codeHash)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

// ── shopping_lists ───────────────────────────────────────────────────────────

export const listTypeEnum = pgEnum('list_type', ['MAIN', 'CUSTOM']);

export const shoppingLists = pgTable(
  'shopping_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: listTypeEnum('type').notNull(),
    createdBy: uuid('created_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Garantía a nivel de BD: como mucho UNA lista MAIN por familia (índice único parcial).
    uniqueIndex('shopping_lists_one_main_per_family')
      .on(table.familyId)
      .where(sql`${table.type} = 'MAIN'`),
    index('shopping_lists_family_idx').on(table.familyId),
  ],
);

// ── shopping_items ───────────────────────────────────────────────────────────

export const shoppingItems = pgTable(
  'shopping_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listId: uuid('list_id')
      .notNull()
      .references(() => shoppingLists.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3 }),
    unit: text('unit'),
    description: text('description'),
    purchaseLink: text('purchase_link'),
    checked: boolean('checked').default(false).notNull(),
    position: integer('position'),
    createdBy: uuid('created_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('shopping_items_list_idx').on(table.listId),
  ],
);

// ── item_comments ────────────────────────────────────────────────────────────

export const itemComments = pgTable(
  'item_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => shoppingItems.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => appUsers.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('item_comments_item_idx').on(table.itemId),
  ],
);

// ── catalog_items ────────────────────────────────────────────────────────────
// Catálogo de artículos por familia: base para dedup semántico y frecuencia.
// Requiere la extensión pgvector (CREATE EXTENSION IF NOT EXISTS vector).

export const catalogItems = pgTable(
  'catalog_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    normalizedName: text('normalized_name').notNull(),
    displayName: text('display_name').notNull(),
    /** Atributos semánticos extraídos (p.ej. { grasa: "entera" }). */
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default({}),
    /**
     * Embedding de 384 dims (BGE-Small-EN-v1.5 vía fastembed).
     * NULL cuando el modelo no pudo generar el vector (modo fallback).
     */
    embedding: vector('embedding', { dimensions: 384 }),
    /** Número de veces que este artículo ha sido añadido a una lista. */
    frequency: integer('frequency').notNull().default(1),
    lastAddedAt: timestamp('last_added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Unicidad: un nombre normalizado es único por familia (base del upsert de frecuencia).
    unique('catalog_items_family_name_unique').on(table.familyId, table.normalizedName),
    index('catalog_items_family_idx').on(table.familyId),
    // Índice HNSW para búsqueda por coseno (pgvector).
    // pgvector ignora automáticamente las filas con NULL en embedding.
    index('catalog_items_embedding_hnsw_idx')
      .using('hnsw', table.embedding.op('vector_cosine_ops'))
      .where(sql`${table.embedding} IS NOT NULL`),
  ],
);

// ── Tipos de fila inferidos (uso interno de infraestructura) ──────────────────

export type AppUserRow = typeof appUsers.$inferSelect;
export type FamilyRow = typeof families.$inferSelect;
export type MembershipRow = typeof memberships.$inferSelect;
export type JoinPinRow = typeof joinPins.$inferSelect;
export type ShoppingListRow = typeof shoppingLists.$inferSelect;
export type ShoppingItemRow = typeof shoppingItems.$inferSelect;
export type ItemCommentRow = typeof itemComments.$inferSelect;
export type CatalogItemRow = typeof catalogItems.$inferSelect;
