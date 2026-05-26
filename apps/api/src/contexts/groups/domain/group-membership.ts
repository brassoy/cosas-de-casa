import { GroupRole } from './group-role';

export interface GroupMembershipProps {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: Date;
}

/**
 * Entidad: pertenencia de un usuario a una peña, con su rol.
 *
 * La invariante "(group, user) único" se garantiza además a nivel de BD con
 * un constraint UNIQUE; aquí el dominio razona sobre roles.
 */
export class GroupMembership {
  readonly id: string;
  readonly groupId: string;
  readonly userId: string;
  private _role: GroupRole;
  readonly joinedAt: Date;

  constructor(props: GroupMembershipProps) {
    this.id = props.id;
    this.groupId = props.groupId;
    this.userId = props.userId;
    this._role = props.role;
    this.joinedAt = props.joinedAt;
  }

  get role(): GroupRole {
    return this._role;
  }

  get isOwner(): boolean {
    return this._role === GroupRole.OWNER;
  }
}
