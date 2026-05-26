import type { PushSubscription } from '../push-subscription';

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');

export interface PushSubscriptionRepository {
  save(sub: PushSubscription): Promise<void>;
  findByUserAndEndpoint(userId: string, endpoint: string): Promise<PushSubscription | null>;
  findByFamily(familyId: string): Promise<PushSubscription[]>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  /** Devuelve los familyId únicos con al menos una suscripción activa. */
  findAllFamilyIds(): Promise<string[]>;
}
