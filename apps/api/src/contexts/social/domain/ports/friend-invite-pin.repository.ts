import type { FriendInvitePin } from '../friend-invite-pin';

export const FRIEND_INVITE_PIN_REPOSITORY = Symbol('FRIEND_INVITE_PIN_REPOSITORY');

export interface FriendInvitePinRepository {
  insert(pin: FriendInvitePin): Promise<void>;

  /**
   * Revoca el PIN ACTIVE de una familia emisora (idempotente).
   * Devuelve el número de PINs revocados.
   */
  revokeActiveByFamily(fromFamilyId: string): Promise<number>;

  /**
   * Consumo ATÓMICO: UPDATE condicional que pasa ACTIVE → CONSUMED y
   * devuelve el `fromFamilyId`. Devuelve `null` si no había PIN válido.
   */
  consumeActiveByHash(params: {
    codeHash: string;
    userId: string;
    byFamilyId: string;
    now: Date;
  }): Promise<{ fromFamilyId: string } | null>;
}
