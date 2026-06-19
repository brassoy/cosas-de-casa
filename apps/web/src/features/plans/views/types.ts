/**
 * Contrato de props de las pantallas de la feature `plans` (planes rápidos).
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable `plans.tsx`) reconciliado
 * con los DTOs reales de `@cosasdecasa/contracts`:
 *
 *  - El kit usaba tipos locales `Plan` / `PlanSummary` / `PlanMessage` / `SavedPlace`
 *    / `Rsvp`. Aquí se usan los DTOs reales que devuelven los hooks: `PlanDto`,
 *    `PlanSummaryDto`, `PlanMessageDto`, `SavedPlaceDto`, `PlanRsvpStatus`.
 *  - El kit modelaba las familias amigas como `{ familyId, familyName }`; el DTO
 *    real `FriendFamilyDto` añade `linkId`. La vista solo necesita
 *    `familyId`/`familyName`, así que el contrato acepta el DTO completo.
 *  - El detalle pinta los participantes con `displayName` + estado RSVP, y el chat
 *    con `messages` ya resueltos (el container resuelve nombres y dedup realtime).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import type {
  PlanDto,
  PlanSummaryDto,
  PlanMessageDto,
  PlanRsvpStatus,
  SavedPlaceDto,
  UpdatePlanInput,
} from '../contracts';
import type { FriendFamilyDto } from '@cosasdecasa/contracts';

// ── plans (lista) ───────────────────────────────────────────────────────────────

export interface PlansViewProps {
  /** Planes de la familia activa. */
  plans: PlanSummaryDto[];
  /** Carga del listado en curso. */
  isLoading?: boolean;
  /** Mensaje de error del listado; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Crea un nuevo plan (navega al formulario en el container). */
  onCreate: () => void;
  /** Abre el detalle de un plan por id. */
  onOpen: (id: string) => void;
}

// ── plan_create (formulario) ──────────────────────────────────────────────────────

/** Lugar emitido por la vista al crear un plan (subset de `PlaceDto`). */
export interface PlanPlaceInput {
  name: string;
  address?: string;
}

/** Valores que emite el formulario al enviar. */
export interface CreatePlanFormValues {
  title: string;
  description?: string;
  scheduledAt?: string;
  place?: PlanPlaceInput;
  /** El usuario marcó "guardar este lugar" (solo cuando es lugar manual nuevo). */
  savePlace?: boolean;
}

export interface CreatePlanViewProps {
  /** Lugares guardados de la familia, para el selector. */
  savedPlaces: SavedPlaceDto[];
  /** La mutación de creación está en curso. */
  isSubmitting?: boolean;
  /** Mensaje de error de la creación; `null`/`undefined` si no hay error. */
  error?: string | null;
  /**
   * Envía el formulario. El container resuelve el toggle saved/manual y el flag
   * `savePlace`; la vista solo emite `place {name,address}` + `savePlace`.
   */
  onSubmit: (values: CreatePlanFormValues) => void;
  /** Cancela y vuelve al listado. */
  onCancel: () => void;
}

// ── plan_detail (detalle + chat) ─────────────────────────────────────────────────

export interface PlanDetailViewProps {
  /** Plan cargado. */
  plan: PlanDto;
  /** Mensajes del chat ya resueltos (nombres + dedup realtime en el container). */
  messages: PlanMessageDto[];
  /** Id del usuario actual (para destacar mis mensajes y mi RSVP). */
  currentUserId: string;
  /** El usuario actual es el creador del plan (controla compartir y eliminar). */
  isOwner: boolean;
  /**
   * Familias amigas candidatas a compartir. El container ya las filtra por
   * `plan.sharedWithFamilyIds` (no se vuelven a ofrecer las ya compartidas).
   */
  friendFamilies: FriendFamilyDto[];
  /** Carga del detalle en curso. */
  isLoading?: boolean;
  /** Mensaje de error del detalle; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Carga inicial de los mensajes del chat en curso. */
  messagesLoading?: boolean;
  /** El RSVP está guardándose. */
  isSavingRsvp?: boolean;
  /** El compartir está en curso. */
  isSharing?: boolean;
  /** El envío de mensaje está en curso. */
  isSendingMessage?: boolean;
  /** La eliminación está en curso. */
  isDeleting?: boolean;
  /** Error al guardar el RSVP. */
  rsvpError?: string | null;
  /** Error al compartir. */
  shareError?: string | null;
  /** Error al eliminar. */
  deleteError?: string | null;
  /**
   * Lugares guardados de la familia, para la sección de gestión (borrar) del
   * detalle. El container los pasa solo para el owner; opcional para no romper
   * consumidores existentes.
   */
  savedPlaces?: SavedPlaceDto[];
  /** La edición del plan está en curso. */
  isUpdating?: boolean;
  /** Error al editar el plan. */
  updateError?: string | null;
  /** El borrado de un lugar guardado está en curso. */
  isDeletingPlace?: boolean;
  /** Error al borrar un lugar guardado. */
  deletePlaceError?: string | null;
  /** Vuelve al listado. */
  onBack: () => void;
  /** Cambia mi respuesta de asistencia. */
  onRsvp: (status: PlanRsvpStatus) => void;
  /** Comparte el plan con una familia amiga. */
  onShare: (familyId: string) => void;
  /** Envía un mensaje al chat. */
  onSendMessage: (body: string) => void;
  /** Elimina el plan (solo owner). */
  onDelete: () => void;
  /**
   * Edita el plan (solo owner). El container construye la mutación PATCH; la
   * vista emite el subset de campos editables (título, descripción, fecha).
   * Opcional para no romper consumidores/tests existentes.
   */
  onUpdatePlan?: (body: UpdatePlanInput) => void;
  /**
   * Borra un lugar guardado de la familia (solo owner). El container pide
   * confirmación y dispara la mutación DELETE. Opcional.
   */
  onDeletePlace?: (placeId: string) => void;
}
