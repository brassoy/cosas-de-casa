/**
 * Entidad: vínculo de amistad entre dos familias (bidireccional).
 *
 * Se normaliza siempre con familyAId < familyBId (lexicográfico UUID) para
 * garantizar unicidad en la BD con una sola restricción UNIQUE(familyA, familyB).
 */
export interface FriendLinkProps {
  id: string;
  familyAId: string;
  familyBId: string;
  createdAt: Date;
}

export class FriendLink {
  readonly id: string;
  readonly familyAId: string;
  readonly familyBId: string;
  readonly createdAt: Date;

  constructor(props: FriendLinkProps) {
    this.id = props.id;
    this.familyAId = props.familyAId;
    this.familyBId = props.familyBId;
    this.createdAt = props.createdAt;
  }

  /** Devuelve la familia "contraria" al id dado. */
  otherFamilyId(familyId: string): string {
    return familyId === this.familyAId ? this.familyBId : this.familyAId;
  }

  /** Comprueba si el vínculo involucra a la familia dada. */
  involves(familyId: string): boolean {
    return this.familyAId === familyId || this.familyBId === familyId;
  }

  /**
   * Normaliza el par (a, b) para que siempre se guarde en el mismo orden
   * y evitar duplicados (A,B) vs (B,A).
   */
  static normalizedPair(fa: string, fb: string): { familyAId: string; familyBId: string } {
    return fa < fb
      ? { familyAId: fa, familyBId: fb }
      : { familyAId: fb, familyBId: fa };
  }
}
