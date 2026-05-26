/**
 * Contratos del feature "familias amigas" (friends).
 *
 * Re-exporta los tipos canónicos de @cosasdecasa/contracts.
 *
 * Endpoints (prefijo /api/v1 lo añade el cliente api):
 *   POST   /families/:familyId/friend-invites          → FriendInviteResponse (201)
 *   POST   /friends/redeem { code, familyId }          → FriendFamilyDto (200)
 *   GET    /families/:familyId/friends                 → FriendFamilyDto[]
 *   DELETE /friends/:linkId                            → void (204)
 */

export type {
  FriendFamilyDto,
  FriendInviteResponse,
  RedeemFriendInviteInput,
} from '@cosasdecasa/contracts';
