import { and, eq, gt } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { friendInvitePins } from '../../../db/schema';
import type { FriendInvitePin } from '../domain/friend-invite-pin';
import type { FriendInvitePinRepository } from '../domain/ports/friend-invite-pin.repository';

export class DrizzleFriendInvitePinRepository implements FriendInvitePinRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async insert(pin: FriendInvitePin): Promise<void> {
    await this.db.insert(friendInvitePins).values({
      id: pin.id,
      fromFamilyId: pin.fromFamilyId,
      codeHash: pin.codeHash,
      status: pin.status,
      expiresAt: pin.expiresAt,
      createdBy: pin.createdBy,
      consumedBy: pin.consumedBy,
      consumedByFamilyId: pin.consumedByFamilyId,
      createdAt: pin.createdAt,
      consumedAt: pin.consumedAt,
    });
  }

  async revokeActiveByFamily(fromFamilyId: string): Promise<number> {
    const updated = await this.db
      .update(friendInvitePins)
      .set({ status: 'REVOKED' })
      .where(
        and(
          eq(friendInvitePins.fromFamilyId, fromFamilyId),
          eq(friendInvitePins.status, 'ACTIVE'),
        ),
      )
      .returning({ id: friendInvitePins.id });
    return updated.length;
  }

  async consumeActiveByHash(params: {
    codeHash: string;
    userId: string;
    byFamilyId: string;
    now: Date;
  }): Promise<{ fromFamilyId: string } | null> {
    const consumed = await this.db
      .update(friendInvitePins)
      .set({
        status: 'CONSUMED',
        consumedBy: params.userId,
        consumedByFamilyId: params.byFamilyId,
        consumedAt: params.now,
      })
      .where(
        and(
          eq(friendInvitePins.codeHash, params.codeHash),
          eq(friendInvitePins.status, 'ACTIVE'),
          gt(friendInvitePins.expiresAt, params.now),
        ),
      )
      .returning({ fromFamilyId: friendInvitePins.fromFamilyId });
    return consumed[0] ?? null;
  }
}
