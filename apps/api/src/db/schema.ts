import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
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
  /** URL pública de la foto de perfil (bucket `avatars`). Null si no tiene. */
  avatarUrl: text('avatar_url'),
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

// ── task_status ──────────────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum('task_status', ['OPEN', 'IN_PROGRESS', 'DONE']);

// ── tasks ─────────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('OPEN'),
    recommendedDate: date('recommended_date'),
    deadlineDate: date('deadline_date'),
    createdBy: uuid('created_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tasks_family_idx').on(table.familyId),
    index('tasks_status_idx').on(table.status),
  ],
);

// ── task_assignees ────────────────────────────────────────────────────────────

export const taskAssignees = pgTable(
  'task_assignees',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index('task_assignees_user_idx').on(table.userId),
  ],
);

// ── task_photos ───────────────────────────────────────────────────────────────

export const taskPhotos = pgTable(
  'task_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('task_photos_task_idx').on(table.taskId),
  ],
);

// ── fridge_location ───────────────────────────────────────────────────────────

export const fridgeLocationEnum = pgEnum('fridge_location', ['FRIDGE', 'FREEZER', 'PANTRY']);

// ── fridge_items ──────────────────────────────────────────────────────────────

export const fridgeItems = pgTable(
  'fridge_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3 }),
    unit: text('unit'),
    location: fridgeLocationEnum('location').notNull().default('FRIDGE'),
    expiryDate: date('expiry_date'),
    createdBy: uuid('created_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('fridge_items_family_idx').on(table.familyId),
    index('fridge_items_expiry_idx').on(table.expiryDate),
  ],
);

// ── push_subscriptions ────────────────────────────────────────────────────────
// Una suscripción Web Push por dispositivo/usuario. El endpoint es único
// (un navegador no puede estar suscrito dos veces al mismo service worker).

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    /** { p256dh: string; auth: string } */
    keys: jsonb('keys').$type<{ p256dh: string; auth: string }>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('push_subscriptions_user_idx').on(table.userId),
    index('push_subscriptions_family_idx').on(table.familyId),
  ],
);

// ── calendar_events ───────────────────────────────────────────────────────────

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    allDay: boolean('all_day').default(false).notNull(),
    /** RRULE iCal (p.ej. FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z). Null si no es recurrente. */
    recurrenceRule: text('recurrence_rule'),
    createdBy: uuid('created_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('calendar_events_family_idx').on(table.familyId),
    index('calendar_events_starts_at_idx').on(table.startsAt),
  ],
);

// ── event_attendees ───────────────────────────────────────────────────────────

export const eventAttendees = pgTable(
  'event_attendees',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => calendarEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index('event_attendees_user_idx').on(table.userId),
  ],
);

// ── couples ───────────────────────────────────────────────────────────────────

export const couples = pgTable(
  'couples',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    /** Miembro A de la pareja (el que inicia la creación). */
    userA: uuid('user_a')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    /** Miembro B de la pareja (el otro miembro elegido). */
    userB: uuid('user_b')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Un par ordenado (userA, userB) es único dentro de una familia.
    unique('couples_family_users_unique').on(table.familyId, table.userA, table.userB),
    index('couples_family_idx').on(table.familyId),
    index('couples_user_a_idx').on(table.userA),
    index('couples_user_b_idx').on(table.userB),
  ],
);

// ── couple_notes ──────────────────────────────────────────────────────────────

export const coupleNotes = pgTable(
  'couple_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('couple_notes_couple_idx').on(table.coupleId),
  ],
);

// ── couple_challenges ─────────────────────────────────────────────────────────

export const coupleChallenges = pgTable(
  'couple_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    /** Clave del catálogo de retos (constante en código). */
    challengeKey: text('challenge_key').notNull(),
    done: boolean('done').default(false).notNull(),
    doneAt: timestamp('done_at', { withTimezone: true }),
  },
  (table) => [
    index('couple_challenges_couple_idx').on(table.coupleId),
  ],
);

// ── groups ────────────────────────────────────────────────────────────────────
// "Peñas" / chupipandis — agrupaciones de usuarios distintas de la familia.

export const groupRoleEnum = pgEnum('group_role', ['OWNER', 'MEMBER']);
export const groupJoinPinStatusEnum = pgEnum('group_join_pin_status', ['ACTIVE', 'CONSUMED', 'REVOKED']);

export const groups = pgTable('groups', {
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

export const groupMemberships = pgTable(
  'group_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    role: groupRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Un usuario no puede estar dos veces en la misma peña.
    unique('group_memberships_group_user_unique').on(table.groupId, table.userId),
    index('group_memberships_user_idx').on(table.userId),
  ],
);

// Solo se persiste el hash (scrypt) del código, nunca el código en claro.
export const groupJoinPins = pgTable(
  'group_join_pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    status: groupJoinPinStatusEnum('status').notNull().default('ACTIVE'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    consumedBy: uuid('consumed_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    // Garantía a nivel de BD: como mucho UN PIN ACTIVE por peña (índice único parcial).
    uniqueIndex('group_join_pins_one_active_per_group')
      .on(table.groupId)
      .where(sql`${table.status} = 'ACTIVE'`),
    // Búsqueda del PIN activo por hash (consumo atómico).
    index('group_join_pins_active_hash_idx')
      .on(table.codeHash)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

// ── friend_invite_pins ────────────────────────────────────────────────────────
// PINs de invitación de amistad entre familias (un solo uso, mismo mecanismo
// que join_pins). Solo se persiste el hash del código.

export const friendInvitePinStatusEnum = pgEnum('friend_invite_pin_status', ['ACTIVE', 'CONSUMED', 'REVOKED']);

export const friendInvitePins = pgTable(
  'friend_invite_pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromFamilyId: uuid('from_family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    status: friendInvitePinStatusEnum('status').notNull().default('ACTIVE'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    consumedBy: uuid('consumed_by').references(() => appUsers.id, { onDelete: 'set null' }),
    consumedByFamilyId: uuid('consumed_by_family_id').references(() => families.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    // Máximo un PIN ACTIVE por familia emisora.
    uniqueIndex('friend_invite_pins_one_active_per_family')
      .on(table.fromFamilyId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index('friend_invite_pins_active_hash_idx')
      .on(table.codeHash)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

// ── friend_links ──────────────────────────────────────────────────────────────
// Vínculo bidireccional entre DOS familias. Un solo registro representa la
// relación; la dirección se infiere comparando familyA/familyB con la familia
// del usuario actuante.

export const friendLinks = pgTable(
  'friend_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyAId: uuid('family_a_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    familyBId: uuid('family_b_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Un par de familias solo puede estar vinculado una vez.
    // La restricción cubre (A,B) pero NO (B,A): la lógica de app garantiza
    // que siempre se guarda con familyAId < familyBId (lexicográfico UUID).
    unique('friend_links_pair_unique').on(table.familyAId, table.familyBId),
    index('friend_links_family_a_idx').on(table.familyAId),
    index('friend_links_family_b_idx').on(table.familyBId),
  ],
);

// ── plan_status ───────────────────────────────────────────────────────────────

export const planStatusEnum = pgEnum('plan_status', ['proposed', 'confirmed', 'cancelled']);
export const planRsvpStatusEnum = pgEnum('plan_rsvp_status', ['going', 'maybe', 'declined']);

// ── saved_places ──────────────────────────────────────────────────────────────

export const savedPlaces = pgTable(
  'saved_places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lng: numeric('lng', { precision: 10, scale: 7 }),
    createdBy: uuid('created_by').references(() => appUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('saved_places_family_idx').on(table.familyId),
  ],
);

// ── plans ─────────────────────────────────────────────────────────────────────

export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerFamilyId: uuid('owner_family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    // Lugar del plan (datos cacheados, sin geocoding activo)
    placeName: text('place_name'),
    placeAddress: text('place_address'),
    placeLat: numeric('place_lat', { precision: 10, scale: 7 }),
    placeLng: numeric('place_lng', { precision: 10, scale: 7 }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    status: planStatusEnum('status').notNull().default('proposed'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('plans_owner_family_idx').on(table.ownerFamilyId),
    index('plans_scheduled_at_idx').on(table.scheduledAt),
    index('plans_status_idx').on(table.status),
  ],
);

// ── plan_shares ───────────────────────────────────────────────────────────────

export const planShares = pgTable(
  'plan_shares',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    sharedAt: timestamp('shared_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.familyId] }),
    index('plan_shares_family_idx').on(table.familyId),
  ],
);

// ── plan_participants ─────────────────────────────────────────────────────────

export const planParticipants = pgTable(
  'plan_participants',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    status: planRsvpStatusEnum('status').notNull().default('going'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.userId] }),
    index('plan_participants_user_idx').on(table.userId),
  ],
);

// ── plan_messages ─────────────────────────────────────────────────────────────

export const planMessages = pgTable(
  'plan_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('plan_messages_plan_idx').on(table.planId),
    index('plan_messages_created_at_idx').on(table.createdAt),
  ],
);

// ── spend_category ───────────────────────────────────────────────────────────

export const spendCategoryEnum = pgEnum('spend_category', [
  'groceries',
  'household',
  'dining_out',
  'leisure',
  'other',
]);

export const receiptStatusEnum = pgEnum('receipt_status', ['draft', 'confirmed']);

// ── receipts ─────────────────────────────────────────────────────────────────

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    merchant: text('merchant'),
    purchasedAt: date('purchased_at').notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('EUR'),
    status: receiptStatusEnum('status').notNull().default('draft'),
    imagePath: text('image_path'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('receipts_family_idx').on(table.familyId),
    index('receipts_purchased_at_idx').on(table.purchasedAt),
  ],
);

// ── receipt_lines ─────────────────────────────────────────────────────────────

export const receiptLines = pgTable(
  'receipt_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    receiptId: uuid('receipt_id')
      .notNull()
      .references(() => receipts.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3 }),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    category: spendCategoryEnum('category').notNull().default('other'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('receipt_lines_receipt_idx').on(table.receiptId),
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
export type TaskRow = typeof tasks.$inferSelect;
export type TaskAssigneeRow = typeof taskAssignees.$inferSelect;
export type TaskPhotoRow = typeof taskPhotos.$inferSelect;
export type FridgeItemRow = typeof fridgeItems.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type CalendarEventRow = typeof calendarEvents.$inferSelect;
export type EventAttendeeRow = typeof eventAttendees.$inferSelect;
export type CoupleRow = typeof couples.$inferSelect;
export type CoupleNoteRow = typeof coupleNotes.$inferSelect;
export type CoupleChallengeRow = typeof coupleChallenges.$inferSelect;
export type GroupRow = typeof groups.$inferSelect;
export type GroupMembershipRow = typeof groupMemberships.$inferSelect;
export type GroupJoinPinRow = typeof groupJoinPins.$inferSelect;
export type FriendInvitePinRow = typeof friendInvitePins.$inferSelect;
export type FriendLinkRow = typeof friendLinks.$inferSelect;
export type SavedPlaceRow = typeof savedPlaces.$inferSelect;
export type PlanRow = typeof plans.$inferSelect;
export type PlanShareRow = typeof planShares.$inferSelect;
export type PlanParticipantRow = typeof planParticipants.$inferSelect;
export type PlanMessageRow = typeof planMessages.$inferSelect;
export type ReceiptRow = typeof receipts.$inferSelect;
export type ReceiptLineRow = typeof receiptLines.$inferSelect;
