import type { FamilyRow, MembershipRow } from '../../../db/schema';
import { Family } from '../domain/family';
import { Membership } from '../domain/membership';

/**
 * Mapper fila ↔ aggregate para `family`. Traduce entre el modelo de
 * persistencia (Drizzle) y el dominio, sin que ninguno conozca al otro.
 */
export const FamilyMapper = {
  toMembership(row: MembershipRow): Membership {
    return new Membership({
      id: row.id,
      familyId: row.familyId,
      userId: row.userId,
      role: row.role,
      joinedAt: row.joinedAt,
    });
  },

  toFamily(row: FamilyRow, memberships: MembershipRow[]): Family {
    return new Family({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.imageUrl,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      memberships: memberships.map((m) => FamilyMapper.toMembership(m)),
    });
  },
};
