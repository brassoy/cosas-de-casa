/**
 * Contrato de props de las pantallas de la feature `groups` (peñas).
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes
 * (plan §2.4). El kit de Lovable NO mapeó un componente base para groups, así que
 * el contrato lo definimos aquí a partir de los hooks reales (useMyGroups,
 * useCreateGroup, useJoinGroup, useGroupMembers, useGenerateGroupPin,
 * useLeaveGroup) reconciliados con los DTOs reales de `@cosasdecasa/contracts`:
 *
 *  - `GroupSummaryDto` para el listado (`GET /groups`, sin miembros).
 *  - `GroupMemberDto` para el detalle (`GET /groups/:id/members`).
 *
 * Reparto container ↔ vista (mismo patrón que `auth`/`menu`/`stats`):
 *  - La VISTA mantiene el estado de UI puro: formularios controlados (nombre,
 *    descripción, PIN), validación/sanitización de UI (PIN base32 Crockford) y la
 *    confirmación de salida en 2 toques (es feedback de interfaz, no negocio).
 *  - El CONTAINER mantiene la lógica real: mutaciones, navegación, guards,
 *    invalidación de queries, `setActiveGroup`/`clearGroup`, y el mapeo de errores
 *    de negocio (`ApiRequestError.body.message`, `friendlyJoinError` 404/410/409),
 *    que llega a la vista por la prop `error`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 */

import type { GroupSummaryDto, GroupMemberDto } from '../contracts';

// ── groups (listado de peñas del usuario) ─────────────────────────────────────

export interface GroupsViewProps {
  /** Peñas a las que pertenece el usuario (resumen, sin miembros). */
  groups: GroupSummaryDto[];
  /** Carga del listado en curso. */
  isLoading?: boolean;
  /** Mensaje de error a mostrar; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Abre el detalle de una peña (el container navega y fija la peña activa). */
  onSelect: (group: GroupSummaryDto) => void;
  /** Navega a la creación de una nueva peña. */
  onCreate: () => void;
  /** Navega a la pantalla de unirse con PIN. */
  onJoin: () => void;
}

// ── group_create (crear peña) ─────────────────────────────────────────────────

export interface CreateGroupViewProps {
  /** La mutación de creación está en curso. */
  isSubmitting?: boolean;
  /** Mensaje de error de negocio a mostrar; `null`/`undefined` si no hay. */
  error?: string | null;
  /**
   * Envío del formulario con los datos ya recogidos por la vista. La
   * sanitización (`trim`, descripción opcional) la hace la vista; la mutación,
   * navegación e invalidación las hace el container.
   */
  onSubmit: (input: { name: string; description?: string }) => void;
}

// ── group_join (unirse con PIN) ───────────────────────────────────────────────

export interface JoinGroupViewProps {
  /** La mutación de unión está en curso. */
  isSubmitting?: boolean;
  /** Mensaje de error de negocio a mostrar (incluye los mensajes 404/410/409). */
  error?: string | null;
  /**
   * Envío del PIN ya saneado y validado por la vista (8 caracteres base32
   * Crockford). El container ejecuta la mutación y mapea los errores de negocio.
   */
  onSubmit: (code: string) => void;
}

// ── group_home (detalle de peña: miembros, invitar, salir) ────────────────────

export interface GroupHomeViewProps {
  /** Nombre de la peña activa (lo resuelve el container desde el store). */
  groupName: string;
  /** ¿El usuario autenticado es OWNER de la peña? (controla "Invitar"). */
  isOwner: boolean;
  /** Miembros de la peña; `undefined` mientras carga. */
  members?: GroupMemberDto[];
  /** Carga de miembros en curso. */
  membersLoading?: boolean;
  /** Error al cargar miembros; `null`/`undefined` si no hay. */
  membersError?: string | null;
  /** PIN de invitación recién generado (mostrado una sola vez); `null` si no hay. */
  generatedPin?: string | null;
  /** La generación del PIN está en curso. */
  pinLoading?: boolean;
  /** Error al generar el PIN; `null`/`undefined` si no hay. */
  pinError?: string | null;
  /** La salida de la peña está en curso. */
  leaveLoading?: boolean;
  /** Error al salir de la peña; `null`/`undefined` si no hay. */
  leaveError?: string | null;
  /** Volver al listado de peñas. */
  onBack: () => void;
  /** Generar un nuevo PIN de invitación (solo OWNER). */
  onGeneratePin: () => void;
  /**
   * Revocar el PIN de invitación activo (solo OWNER). OPCIONAL: si el container
   * no lo cablea, la vista no muestra el botón de revocar. La confirmación vive
   * en el container (`window.confirm`).
   */
  onRevokePin?: () => void;
  /** La revocación del PIN está en curso. */
  pinRevoking?: boolean;
  /** Error al revocar el PIN; `null`/`undefined` si no hay. */
  pinRevokeError?: string | null;
  /**
   * Salir de la peña. La confirmación en 2 toques es UI y vive en la vista; el
   * container solo recibe la confirmación final y ejecuta la mutación.
   */
  onLeave: () => void;
}
