import { MembershipRole } from './membership-role';

export interface MembershipProps {
  id: string;
  familyId: string;
  userId: string;
  role: MembershipRole;
  joinedAt: Date;
}

/**
 * Entidad: pertenencia de un usuario a una familia, con su rol.
 *
 * La invariante "(family, user) único" se garantiza además a nivel de BD con
 * un constraint UNIQUE; aquí el dominio razona sobre roles.
 */
export class Membership {
  readonly id: string;
  readonly familyId: string;
  readonly userId: string;
  private _role: MembershipRole;
  readonly joinedAt: Date;

  constructor(props: MembershipProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this.userId = props.userId;
    this._role = props.role;
    this.joinedAt = props.joinedAt;
  }

  get role(): MembershipRole {
    return this._role;
  }

  get isOwner(): boolean {
    return this._role === MembershipRole.OWNER;
  }
}
