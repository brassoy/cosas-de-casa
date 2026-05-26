import type { Plan } from '../plan';

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');

export interface PlanRepository {
  insert(plan: Plan): Promise<void>;
  findById(planId: string): Promise<Plan | null>;
  /** Planes de los que la familia es owner O en los que está en plan_shares. */
  listByFamilyAccess(familyId: string): Promise<Plan[]>;
  update(plan: Plan): Promise<void>;
  deleteById(planId: string): Promise<void>;
  insertShare(planId: string, familyId: string, sharedAt: Date): Promise<void>;
  insertOrUpdateParticipant(planId: string, userId: string, status: string, updatedAt: Date): Promise<void>;
}
