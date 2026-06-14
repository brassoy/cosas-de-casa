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

import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';

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
}
