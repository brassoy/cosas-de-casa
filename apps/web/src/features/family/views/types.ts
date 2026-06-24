/* ─── Contrato de props — vistas de la feature `family` ─────────────────────
 *
 * Una interface por pantalla (plan §2.4). El contrato es el del componente base
 * del kit (Lovable `family.tsx`) reconciliado con los DTOs reales de
 * `@cosasdecasa/contracts`. Pantallas: onboarding, family_create, family_join,
 * family_home.
 *
 * Reconciliaciones kit ↔ contracts:
 *  - El kit usaba un tipo local `FamilyMember`; aquí se usa `FamilyMemberDto`
 *    real (`userId`, `displayName`, `role`, `joinedAt`, `avatarUrl?`).
 *  - El kit usaba `GeneratedPin`; aquí se usa `GeneratePinResponse` real
 *    (`{ code, expiresAt }`).
 *  - `onOpen(section)` del kit emite una RUTA (string). El mapeo a ~11 destinos
 *    lo hace el container (que conoce el router); la vista solo emite la ruta.
 *  - Notificaciones: por decisión §7.E se exponen como PROPS PURAS
 *    (`notificationsEnabled` / `onToggleNotifications`), no como el componente
 *    real `NotificationToggle`. El container deriva el estado de los stores.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import type {
  FamilyMemberDto,
  GeneratePinResponse,
  MembershipRole,
} from '@cosasdecasa/contracts';

/** Acceso rápido del grid de la home (tile → ruta destino). */
export interface FamilyQuickAccess {
  /** Identificador estable y destino que el container resuelve en `onOpen`. */
  id: string;
  emoji: string;
  label: string;
}

// ── onboarding ─────────────────────────────────────────────────────────────

export interface OnboardingViewProps {
  /** Ir a crear una nueva unidad familiar. */
  onCreateFamily: () => void;
  /** Ir a unirse con un PIN. */
  onJoinFamily: () => void;
}

// ── family_create ──────────────────────────────────────────────────────────

export interface CreateFamilyViewProps {
  /** El alta está en curso (`useCreateFamily().isPending`). */
  isSubmitting?: boolean;
  /** Mensaje de error de negocio (`ApiRequestError.body.message`). */
  error?: string | null;
  /** Envío del formulario con los campos ya validados por la vista. */
  onSubmit: (input: { name: string; description?: string }) => void;
}

// ── family_join ────────────────────────────────────────────────────────────

export interface JoinFamilyViewProps {
  /** La unión está en curso (`useJoinFamily().isPending`). */
  isSubmitting?: boolean;
  /**
   * Mensaje de error de negocio ya traducido por el container
   * (`friendlyJoinError`: 404 no existe / 410 caducado / 409 usado).
   */
  error?: string | null;
  /**
   * Envío del PIN ya sanitizado (uppercase, filtro Crockford, slice 8) por la
   * vista. La validación de formato Crockford definitiva vive en el container.
   */
  onSubmit: (code: string) => void;
}

// ── family_home ────────────────────────────────────────────────────────────

export interface FamilyHomeViewProps {
  familyId: string;
  familyName: string;
  /** El usuario autenticado es OWNER de la familia. */
  isOwner: boolean;
  /** Miembros de la familia (DTO real). */
  members: FamilyMemberDto[];
  membersLoading?: boolean;
  membersError?: string | null;
  /** Accesos rápidos a renderizar en el grid (el container decide el orden). */
  quickAccess: FamilyQuickAccess[];
  /** PIN generado (respuesta real `{ code, expiresAt }`) o null. */
  generatedPin?: GeneratePinResponse | null;
  /** La generación de PIN está en curso. */
  pinLoading?: boolean;
  /** Error al generar el PIN. */
  pinError?: string | null;
  /** Estado de notificaciones push en este dispositivo (prop pura, §7.E). */
  notificationsEnabled: boolean;
  /** Las notificaciones no se pueden alternar (no soportadas/bloqueadas). */
  notificationsDisabled?: boolean;
  /** Texto descriptivo del estado de notificaciones (copy del store). */
  notificationsHint?: string;
  /** La acción de activar notificaciones está en curso. */
  notificationsLoading?: boolean;
  onToggleNotifications: () => void;
  onGeneratePin: () => void;
  /** Copia el PIN al portapapeles. */
  onCopyPin: () => void;
  /** Comparte el PIN por el canal indicado. */
  onShare: (channel: 'whatsapp' | 'telegram') => void;
  /** Abre una sección (recibe el `id`/ruta del acceso rápido). */
  onOpen: (section: string) => void;
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
   * Salir de la familia. OPCIONAL: si el container no lo cablea, la vista no
   * muestra el botón de salir. La confirmación fuerte vive en el container
   * (`window.confirm`); la vista solo emite el callback.
   */
  onLeaveFamily?: () => void;
  /** La salida de la familia está en curso. */
  leaveLoading?: boolean;
  /** Error al salir de la familia; `null`/`undefined` si no hay. */
  leaveError?: string | null;

  /**
   * Sección "Gestionar familia" (solo OWNER). OPCIONAL: si el container no
   * cablea `manage`, la vista no muestra la sección. Reúne las tres acciones de
   * administración: gestión de miembros (cambiar rol / expulsar), edición del
   * nombre y descripción, y borrado de la familia.
   *
   * Toda la lógica (confirmaciones, llamadas a la API, navegación) vive en el
   * container; la vista solo pinta el estado y emite callbacks.
   */
  manage?: FamilyManageProps;
}

// ── Sección "Gestionar familia" (solo OWNER) ─────────────────────────────────

export interface FamilyManageProps {
  // — Gestión de miembros —
  /**
   * Cambiar el rol de un miembro. El `userId` propio del OWNER no se ofrece (el
   * container filtra al usuario actual para evitar auto-degradarse sin querer).
   */
  onChangeRole: (userId: string, role: MembershipRole) => void;
  /** Expulsar a un miembro (la confirmación vive en el container). */
  onRemoveMember: (userId: string) => void;
  /** Id del usuario autenticado: la vista no ofrece gestionarse a sí mismo. */
  currentUserId: string;
  /** `userId` cuyo cambio de rol está en curso (para deshabilitar su control). */
  roleChangingId?: string | null;
  /** `userId` cuya expulsión está en curso (para deshabilitar su control). */
  removingId?: string | null;
  /** Error de gestión de miembros (cambio de rol o expulsión). */
  memberError?: string | null;

  // — Editar nombre/descripción —
  /** Valor inicial del nombre (precargado desde el detalle de la familia). */
  initialName: string;
  /** Valor inicial de la descripción (precargado; cadena vacía si no hay). */
  initialDescription: string;
  /** Guardar nombre/descripción. La vista envía solo los campos con cambios. */
  onSaveDetails: (input: { name?: string; description?: string }) => void;
  /** El guardado de detalles está en curso. */
  detailsSaving?: boolean;
  /** Error al guardar los detalles. */
  detailsError?: string | null;

  // — Borrar la familia —
  /** Borrar la familia (confirmación FUERTE en el container). */
  onDeleteFamily: () => void;
  /** El borrado está en curso. */
  deleteLoading?: boolean;
  /** Error al borrar la familia. */
  deleteError?: string | null;
}

// ── family_manage ────────────────────────────────────────────────────────────

export interface FamilyManageViewProps {
  /**
   * Datos y callbacks de las tres acciones de administración (gestión de
   * miembros, edición de nombre/descripción y borrado de la familia). Toda la
   * lógica (confirmaciones, llamadas a la API, navegación) vive en el container.
   */
  manage: FamilyManageProps;
  /** Miembros de la familia (DTO real) para la sección de gestión de roles. */
  members: FamilyMemberDto[];
  /** Volver a la home de la familia (la navegación vive en el container). */
  onBack: () => void;
}
