import {
  AlreadyMemberError,
  CannotRemoveSelfError,
  LastOwnerError,
  NotAMemberError,
} from './family.errors';
import { Membership } from './membership';
import { MembershipRole } from './membership-role';

export interface FamilyProps {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  memberships: Membership[];
}

export interface NewFamilyParams {
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
 * Aggregate root del contexto `family`.
 *
 * Invariantes que protege:
 * - Al crearse, el creador queda como OWNER.
 * - SIEMPRE debe quedar al menos un OWNER (no se puede salir/degradar al último).
 * - Un usuario aparece como máximo una vez (también reforzado por la BD).
 */
export class Family {
  readonly id: string;
  private _name: string;
  private _description: string | null;
  private _imageUrl: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private readonly _memberships: Membership[];

  constructor(props: FamilyProps) {
    this.id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._memberships = [...props.memberships];
  }

  /** Crea una familia nueva con su OWNER inicial (el creador). */
  static create(params: NewFamilyParams): Family {
    const ownerMembership = new Membership({
      id: params.ownerMembershipId,
      familyId: params.id,
      userId: params.ownerUserId,
      role: MembershipRole.OWNER,
      joinedAt: params.now,
    });
    return new Family({
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

  get members(): readonly Membership[] {
    return this._memberships;
  }

  membershipOf(userId: string): Membership | undefined {
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
   * Añade un nuevo miembro con rol MEMBER. Lanza {@link AlreadyMemberError} si
   * el usuario ya pertenece a la familia.
   */
  addMember(params: { membershipId: string; userId: string; now: Date }): Membership {
    if (this.isMember(params.userId)) {
      throw new AlreadyMemberError();
    }
    const membership = new Membership({
      id: params.membershipId,
      familyId: this.id,
      userId: params.userId,
      role: MembershipRole.MEMBER,
      joinedAt: params.now,
    });
    this._memberships.push(membership);
    return membership;
  }

  /**
   * Saca a un usuario de la familia. Protege la invariante del último OWNER:
   * si el que sale es el único OWNER, lanza {@link LastOwnerError}.
   *
   * Devuelve la membership eliminada (para que el repo borre por id).
   */
  removeMember(userId: string): Membership {
    const membership = this.membershipOf(userId);
    if (!membership) {
      throw new NotAMemberError();
    }
    if (membership.isOwner && this.ownerCount() === 1) {
      throw new LastOwnerError();
    }
    const index = this._memberships.indexOf(membership);
    this._memberships.splice(index, 1);
    return membership;
  }

  /**
   * Expulsa a OTRO miembro (acción de administración del OWNER). A diferencia de
   * {@link removeMember}, prohíbe expulsarse a uno mismo: para eso existe la ruta
   * "salir de la familia". Mantiene la protección del último OWNER.
   *
   * @param actingUserId quién ejecuta la expulsión (el OWNER autenticado).
   * @param targetUserId a quién se expulsa.
   */
  expelMember(actingUserId: string, targetUserId: string): Membership {
    if (actingUserId === targetUserId) {
      throw new CannotRemoveSelfError();
    }
    return this.removeMember(targetUserId);
  }

  /**
   * Cambia el rol de un miembro (OWNER ↔ MEMBER). Protege la invariante "al menos
   * un OWNER": si se intenta degradar al único OWNER a MEMBER, lanza
   * {@link LastOwnerError}.
   *
   * Es idempotente: si el rol ya coincide, no hace nada. Devuelve la membership
   * afectada para que el repo persista el cambio.
   */
  changeMemberRole(targetUserId: string, newRole: MembershipRole, now: Date): Membership {
    const membership = this.membershipOf(targetUserId);
    if (!membership) {
      throw new NotAMemberError();
    }
    if (membership.role === newRole) {
      return membership;
    }
    // Degradar al único OWNER dejaría la familia sin propietario.
    if (membership.isOwner && newRole === MembershipRole.MEMBER && this.ownerCount() === 1) {
      throw new LastOwnerError();
    }
    membership.changeRole(newRole);
    this._updatedAt = now;
    return membership;
  }

  /**
   * Edita los datos de la familia (nombre y/o descripción). Actualización
   * parcial: solo toca los campos `!== undefined`. Una `description` vacía
   * (`''`) la deja a `null`. Refresca `updatedAt`.
   */
  rename(params: { name?: string; description?: string; now: Date }): void {
    if (params.name !== undefined) {
      this._name = params.name;
    }
    if (params.description !== undefined) {
      this._description = params.description === '' ? null : params.description;
    }
    this._updatedAt = params.now;
  }
}
