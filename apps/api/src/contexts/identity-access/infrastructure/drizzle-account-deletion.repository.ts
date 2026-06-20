import { and, eq, inArray, ne } from 'drizzle-orm';
import type { Database } from '../../../db/db.types';
import { appUsers, families, joinPins, memberships } from '../../../db/schema';
import type {
  AccountDeletionRepository,
  CreatedFamilySummary,
} from '../domain/ports/account-deletion.repository';

/**
 * Adaptador Drizzle de {@link AccountDeletionRepository}.
 *
 * Toca tablas de otros contextos (`families`, `memberships`, `join_pins`) porque
 * la baja de cuenta es transversal por naturaleza; eso es legítimo a nivel de
 * INFRAESTRUCTURA (el dominio no sabe nada de esto). La API se conecta con un rol
 * que respeta RLS, así que estas operaciones solo afectan a filas accesibles para
 * el usuario; la autorización fina (que es su propia cuenta) la garantiza el
 * caso de uso, que recibe el `userId` del JWT.
 */
export class DrizzleAccountDeletionRepository implements AccountDeletionRepository {
  constructor(private readonly db: Database) {}

  async findFamiliesCreatedBy(userId: string): Promise<CreatedFamilySummary[]> {
    const createdFamilies = await this.db
      .select({ id: families.id })
      .from(families)
      .where(eq(families.createdBy, userId));

    const familyIds = createdFamilies.map((f) => f.id);
    if (familyIds.length === 0) {
      return [];
    }

    // Otros miembros (no el usuario) de esas familias, en una sola consulta.
    const otherMemberRows = await this.db
      .select({
        familyId: memberships.familyId,
        userId: memberships.userId,
        role: memberships.role,
      })
      .from(memberships)
      .where(and(inArray(memberships.familyId, familyIds), ne(memberships.userId, userId)));

    const byFamily = new Map<string, CreatedFamilySummary['otherMembers']>();
    for (const row of otherMemberRows) {
      const list = byFamily.get(row.familyId) ?? [];
      list.push({ userId: row.userId, isOwner: row.role === 'OWNER' });
      byFamily.set(row.familyId, list);
    }

    return familyIds.map((familyId) => ({
      familyId,
      otherMembers: byFamily.get(familyId) ?? [],
    }));
  }

  async reassignFamilyCreator(familyId: string, newCreatorId: string): Promise<void> {
    await this.db
      .update(families)
      .set({ createdBy: newCreatorId })
      .where(eq(families.id, familyId));
  }

  async deleteFamily(familyId: string): Promise<void> {
    // Las FKs `ON DELETE CASCADE` limpian memberships, PINs, listas, tareas, etc.
    await this.db.delete(families).where(eq(families.id, familyId));
  }

  async deleteJoinPinsCreatedBy(userId: string): Promise<void> {
    await this.db.delete(joinPins).where(eq(joinPins.createdBy, userId));
  }

  async deleteAppUser(userId: string): Promise<void> {
    await this.db.delete(appUsers).where(eq(appUsers.id, userId));
  }
}
