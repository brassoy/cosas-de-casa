import { Inject, Injectable } from '@nestjs/common';
import { Plan } from '../domain/plan';
import { SavedPlace } from '../domain/saved-place';
import { PlanFamilyMemberError } from '../domain/plans.errors';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';
import { SAVED_PLACE_REPOSITORY, type SavedPlaceRepository } from '../domain/ports/saved-place.repository';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../../family/domain/ports/family.repository';
import { FRIEND_LINK_REPOSITORY, type FriendLinkRepository } from '../../social/domain/ports/friend-link.repository';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../../notifications/domain/ports/push-subscription.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSenderPort,
} from '../../notifications/domain/ports/notification-sender.port';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import type { PlaceData } from '../domain/plan';

export interface CreatePlanCommand {
  actingUserId: string;
  ownerFamilyId: string;
  title: string;
  description?: string | null;
  place?: PlaceData | null;
  savePlace?: boolean;
  scheduledAt?: Date | null;
}

@Injectable()
export class CreatePlanUseCase {
  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(SAVED_PLACE_REPOSITORY) private readonly savedPlaces: SavedPlaceRepository,
    @Inject(FRIEND_LINK_REPOSITORY) private readonly friendLinks: FriendLinkRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSenderPort,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreatePlanCommand): Promise<Plan> {
    const family = await this.families.findById(command.ownerFamilyId);
    if (!family || !family.isMember(command.actingUserId)) {
      throw new PlanFamilyMemberError();
    }

    const now = this.clock.now();
    const plan = Plan.create({
      id: this.ids.generate(),
      ownerFamilyId: command.ownerFamilyId,
      title: command.title,
      description: command.description,
      place: command.place,
      scheduledAt: command.scheduledAt,
      createdBy: command.actingUserId,
      now,
    });

    await this.plans.insert(plan);

    // Si se pide guardar el lugar y hay datos de lugar.
    if (command.savePlace && command.place) {
      const savedPlace = new SavedPlace({
        id: this.ids.generate(),
        familyId: command.ownerFamilyId,
        name: command.place.name,
        address: command.place.address,
        lat: command.place.lat,
        lng: command.place.lng,
        createdBy: command.actingUserId,
        createdAt: now,
      });
      await this.savedPlaces.insert(savedPlace);
    }

    // Auto-compartir con las familias amigas: el plan se comparte al crearse con
    // todas las familias vinculadas por amistad y se notifica a sus miembros, de
    // modo que aparezca en sus "planes" sin un paso manual de compartir.
    const links = await this.friendLinks.listByFamily(command.ownerFamilyId);
    for (const link of links) {
      const friendFamilyId = link.otherFamilyId(command.ownerFamilyId);
      await this.plans.insertShare(plan.id, friendFamilyId, now);
      plan.addShare(friendFamilyId, now);
      await notifyFamilyOfSharedPlan(
        this.subscriptions,
        this.sender,
        friendFamilyId,
        family.name,
        plan.title,
      );
    }

    return plan;
  }
}

/**
 * Notifica (push, best-effort) a los miembros de una familia amiga que se ha
 * compartido un plan con ella. Un fallo de push NUNCA debe tumbar la creación o
 * la compartición del plan, por eso se traga el error. Se comparte con
 * `share-plan.use-case` para no duplicar la lógica de envío.
 */
export async function notifyFamilyOfSharedPlan(
  subscriptions: PushSubscriptionRepository,
  sender: NotificationSenderPort,
  familyId: string,
  ownerFamilyName: string,
  planTitle: string,
): Promise<void> {
  try {
    const subs = await subscriptions.findByFamily(familyId);
    if (subs.length === 0) return;
    const targets = subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys }));
    await sender.sendToTargets(targets, {
      title: '📅 Nueva propuesta de plan',
      body: `${ownerFamilyName} propone: ${planTitle}`,
      url: '/plans',
    });
  } catch {
    // Best-effort: ignoramos fallos de push (VAPID ausente, endpoint caducado…).
  }
}
