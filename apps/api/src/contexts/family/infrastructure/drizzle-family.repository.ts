import { eq, inArray } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { families, memberships } from '../../../db/schema';
import type { Family } from '../domain/family';
import type { FamilyRepository } from '../domain/ports/family.repository';
import { FamilyMapper } from './family.mapper';

/**
 * Adaptador Drizzle de {@link FamilyRepository}. Recibe un `DatabaseExecutor`
 * (conexión raíz o transacción), de modo que el mismo código sirve dentro o
 * fuera de una Unit of Work.
 */
export class DrizzleFamilyRepository implements FamilyRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(family: Family): Promise<void> {
    await this.db.insert(families).values({
      id: family.id,
      name: family.name,
      description: family.description,
      imageUrl: family.imageUrl,
      createdBy: family.createdBy,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
    });

    // El aggregate recién creado trae exactamente su membership OWNER.
    const rows = family.members.map((m) => ({
      id: m.id,
      familyId: m.familyId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
    if (rows.length > 0) {
      await this.db.insert(memberships).values(rows);
    }
  }

  async findById(familyId: string): Promise<Family | null> {
    const familyRows = await this.db.select().from(families).where(eq(families.id, familyId)).limit(1);
    const familyRow = familyRows[0];
    if (!familyRow) {
      return null;
    }
    const memberRows = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.familyId, familyId));
    return FamilyMapper.toFamily(familyRow, memberRows);
  }

  async findByMember(userId: string): Promise<Family[]> {
    const myMemberships = await this.db
      .select({ familyId: memberships.familyId })
      .from(memberships)
      .where(eq(memberships.userId, userId));
    const familyIds = myMemberships.map((m) => m.familyId);
    if (familyIds.length === 0) {
      return [];
    }

    const familyRows = await this.db.select().from(families).where(inArray(families.id, familyIds));
    // Cargamos todas las memberships de esas familias en una sola consulta.
    const allMembers = await this.db
      .select()
      .from(memberships)
      .where(inArray(memberships.familyId, familyIds));

    const byFamily = new Map<string, typeof allMembers>();
    for (const row of allMembers) {
      const list = byFamily.get(row.familyId) ?? [];
      list.push(row);
      byFamily.set(row.familyId, list);
    }

    return familyRows.map((row) => FamilyMapper.toFamily(row, byFamily.get(row.id) ?? []));
  }
}
