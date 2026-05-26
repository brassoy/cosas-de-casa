import {
  AlreadyGroupMemberError,
  LastGroupOwnerError,
  NotAGroupMemberError,
} from './group.errors';
import { GroupMembership } from './group-membership';
import { GroupRole } from './group-role';

export interface GroupProps {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  memberships: GroupMembership[];
}

export interface NewGroupParams {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  /** Usuario creador: pasa a ser OWNER. */
  ownerUserId: string;
  ownerMembershipId: string;
  now: Date;
}

/**
 * Aggregate root del contexto `groups`.
 *
 * Invariantes que protege:
 * - Al crearse, el creador queda como OWNER.
 * - SIEMPRE debe quedar al menos un OWNER (no se puede salir/degradar al último).
 * - Un usuario aparece como máximo una vez (también reforzado por la BD).
 */
export class Group {
  readonly id: string;
  private _name: string;
  private _description: string | null;
  private _imageUrl: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private readonly _memberships: GroupMembership[];

  constructor(props: GroupProps) {
    this.id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._memberships = [...props.memberships];
  }

  /** Crea una peña nueva con su OWNER inicial (el creador). */
  static create(params: NewGroupParams): Group {
    const ownerMembership = new GroupMembership({
      id: params.ownerMembershipId,
      groupId: params.id,
      userId: params.ownerUserId,
      role: GroupRole.OWNER,
      joinedAt: params.now,
    });
    return new Group({
      id: params.id,
      name: params.name,
      description: params.description ?? null,
      imageUrl: params.imageUrl ?? null,
      createdBy: params.ownerUserId,
      createdAt: params.now,
      updatedAt: params.now,
      memberships: [ownerMembership],
    });
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get members(): readonly GroupMembership[] {
    return this._memberships;
  }

  membershipOf(userId: string): GroupMembership | undefined {
    return this._memberships.find((m) => m.userId === userId);
  }

  isMember(userId: string): boolean {
    return this.membershipOf(userId) !== undefined;
  }

  isOwner(userId: string): boolean {
    return this.membershipOf(userId)?.isOwner ?? false;
  }

  private ownerCount(): number {
    return this._memberships.filter((m) => m.isOwner).length;
  }

  /**
   * Añade un nuevo miembro con rol MEMBER. Lanza {@link AlreadyGroupMemberError} si
   * el usuario ya pertenece a la peña.
   */
  addMember(params: { membershipId: string; userId: string; now: Date }): GroupMembership {
    if (this.isMember(params.userId)) {
      throw new AlreadyGroupMemberError();
    }
    const membership = new GroupMembership({
      id: params.membershipId,
      groupId: this.id,
      userId: params.userId,
      role: GroupRole.MEMBER,
      joinedAt: params.now,
    });
    this._memberships.push(membership);
    return membership;
  }

  /**
   * Saca a un usuario de la peña. Protege la invariante del último OWNER:
   * si el que sale es el único OWNER, lanza {@link LastGroupOwnerError}.
   *
   * Devuelve la membership eliminada (para que el repo borre por id).
   */
  removeMember(userId: string): GroupMembership {
    const membership = this.membershipOf(userId);
    if (!membership) {
      throw new NotAGroupMemberError();
    }
    if (membership.isOwner && this.ownerCount() === 1) {
      throw new LastGroupOwnerError();
    }
    const index = this._memberships.indexOf(membership);
    this._memberships.splice(index, 1);
    return membership;
  }
}
