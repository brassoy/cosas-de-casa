import { CannotCoupleWithSelfError } from './romantic.errors';

export interface CoupleProps {
  id: string;
  familyId: string;
  userA: string;
  userB: string;
  createdAt: Date;
}

/**
 * Aggregate Couple.
 *
 * Invariantes:
 * - Los dos miembros deben ser distintos.
 * - Un par (familyId, userA, userB) es único (garantizado también por BD).
 *
 * Decisión de diseño: almacenamos el par ordenado (userA=creador, userB=partner)
 * pero la privacidad se basa en pertenecer al par independientemente del rol.
 * El guard comprueba `isMember(userId)` para aislar el rincón.
 */
export class Couple {
  readonly id: string;
  readonly familyId: string;
  readonly userA: string;
  readonly userB: string;
  readonly createdAt: Date;

  constructor(props: CoupleProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this.userA = props.userA;
    this.userB = props.userB;
    this.createdAt = props.createdAt;
  }

  /** Crea una pareja nueva validando que los dos miembros sean distintos. */
  static create(params: { id: string; familyId: string; userA: string; userB: string; now: Date }): Couple {
    if (params.userA === params.userB) {
      throw new CannotCoupleWithSelfError();
    }
    return new Couple({
      id: params.id,
      familyId: params.familyId,
      userA: params.userA,
      userB: params.userB,
      createdAt: params.now,
    });
  }

  /** El otro miembro de la pareja dado un userId. */
  partnerOf(userId: string): string {
    return this.userA === userId ? this.userB : this.userA;
  }

  /** Indica si el userId pertenece a la pareja. */
  isMember(userId: string): boolean {
    return this.userA === userId || this.userB === userId;
  }
}
