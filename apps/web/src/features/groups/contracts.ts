/**
 * Contratos del feature "peñas" (groups).
 *
 * Los tipos de dominio se importan directamente de @cosasdecasa/contracts,
 * que es la fuente de verdad compartida con el backend.
 *
 * Endpoints reales (GroupsController, /api/v1/groups):
 *   GET    /api/v1/groups                   → GroupSummaryDto[]
 *   POST   /api/v1/groups                   → GroupSummaryDto       (body: CreateGroupInput)
 *   POST   /api/v1/groups/join              → { groupId: string; joined: boolean }  (body: { code: string })
 *   GET    /api/v1/groups/:id/members       → GroupMemberDto[]
 *   POST   /api/v1/groups/:id/join-pins     → GenerateGroupPinResponse ({ code, expiresAt })
 *   DELETE /api/v1/groups/:id/members/me   → void
 *   DELETE /api/v1/groups/:id/join-pins/active → void
 */

// Re-exportamos los tipos del paquete de contratos para que el resto del
// feature los importe desde un único punto interno.
export type {
  GroupRole,
  GroupMemberDto,
  GroupSummaryDto,
  GroupDto,
  CreateGroupInput,
  UpdateGroupInput,
  ChangeGroupMemberRoleInput,
  GenerateGroupPinResponse,
} from '@cosasdecasa/contracts';

// ── Constantes de UI ──────────────────────────────────────────────────────────

// PIN: 8 caracteres base32 Crockford (0-9 A-Z sin I, L, O, U)
export const GROUP_PIN_LENGTH = 8;
export const GROUP_PIN_REGEX = /^[0-9A-HJKMNP-TV-Z]{8}$/;
