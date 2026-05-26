import { InvalidFriendInvitePinError } from './social.errors';

export type FriendInvitePinStatus = 'ACTIVE' | 'CONSUMED' | 'REVOKED';

export const FriendInvitePinStatus = {
  ACTIVE: 'ACTIVE',
  CONSUMED: 'CONSUMED',
  REVOKED: 'REVOKED',
} as const satisfies Record<string, FriendInvitePinStatus>;

export const DEFAULT_FRIEND_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export interface FriendInvitePinProps {
  id: string;
  fromFamilyId: string;
  codeHash: string;
  status: FriendInvitePinStatus;
  expiresAt: Date;
  createdBy: string;
  consumedBy: string | null;
  consumedByFamilyId: string | null;
  createdAt: Date;
  consumedAt: Date | null;
}

export interface NewFriendInvitePinParams {
  id: string;
  fromFamilyId: string;
  codeHash: string;
  createdBy: string;
  now: Date;
  ttlMs?: number;
}

/**
 * Entidad: PIN de invitación de amistad entre familias (un solo uso).
 *
 * Máquina de estados: ACTIVE → CONSUMED (al canjear) o ACTIVE → REVOKED.
 * El consumo en producción es ATÓMICO en el repositorio (UPDATE ... WHERE).
 */
export class FriendInvitePin {
  readonly id: string;
  readonly fromFamilyId: string;
  readonly codeHash: string;
  private _status: FriendInvitePinStatus;
  readonly expiresAt: Date;
  readonly createdBy: string;
  private _consumedBy: string | null;
  private _consumedByFamilyId: string | null;
  readonly createdAt: Date;
  private _consumedAt: Date | null;

  constructor(props: FriendInvitePinProps) {
    this.id = props.id;
    this.fromFamilyId = props.fromFamilyId;
    this.codeHash = props.codeHash;
    this._status = props.status;
    this.expiresAt = props.expiresAt;
    this.createdBy = props.createdBy;
    this._consumedBy = props.consumedBy;
    this._consumedByFamilyId = props.consumedByFamilyId;
    this.createdAt = props.createdAt;
    this._consumedAt = props.consumedAt;
  }

  static issue(params: NewFriendInvitePinParams): FriendInvitePin {
    const ttl = params.ttlMs ?? DEFAULT_FRIEND_INVITE_TTL_MS;
    return new FriendInvitePin({
      id: params.id,
      fromFamilyId: params.fromFamilyId,
      codeHash: params.codeHash,
      status: FriendInvitePinStatus.ACTIVE,
      expiresAt: new Date(params.now.getTime() + ttl),
      createdBy: params.createdBy,
      consumedBy: null,
      consumedByFamilyId: null,
      createdAt: params.now,
      consumedAt: null,
    });
  }

  get status(): FriendInvitePinStatus {
    return this._status;
  }

  get consumedBy(): string | null {
    return this._consumedBy;
  }

  get consumedByFamilyId(): string | null {
    return this._consumedByFamilyId;
  }

  get consumedAt(): Date | null {
    return this._consumedAt;
  }

  isActive(): boolean {
    return this._status === FriendInvitePinStatus.ACTIVE;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  isRedeemable(now: Date): boolean {
    return this.isActive() && !this.isExpired(now);
  }

  consume(params: { userId: string; byFamilyId: string; now: Date }): void {
    if (!this.isRedeemable(params.now)) {
      throw new InvalidFriendInvitePinError();
    }
    this._status = FriendInvitePinStatus.CONSUMED;
    this._consumedBy = params.userId;
    this._consumedByFamilyId = params.byFamilyId;
    this._consumedAt = params.now;
  }

  revoke(): void {
    if (this._status === FriendInvitePinStatus.ACTIVE) {
      this._status = FriendInvitePinStatus.REVOKED;
    }
  }
}
