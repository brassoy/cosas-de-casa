import type { PlanDetailView } from '../application/ports/plans-read-model';
import type { Plan } from '../domain/plan';
import type { SavedPlace } from '../domain/saved-place';
import type { PlanDto, PlanSummaryDto, SavedPlaceDto } from '@cosasdecasa/contracts';

export const PlansPresenter = {
  toPlanDto(view: PlanDetailView): PlanDto {
    return {
      id: view.id,
      title: view.title,
      description: view.description ?? undefined,
      place: view.place
        ? {
            name: view.place.name,
            address: view.place.address ?? undefined,
            lat: view.place.lat ?? undefined,
            lng: view.place.lng ?? undefined,
          }
        : undefined,
      scheduledAt: view.scheduledAt?.toISOString(),
      status: view.status,
      ownerFamilyId: view.ownerFamilyId,
      createdBy: view.createdBy,
      participants: view.participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName ?? p.userId,
        status: p.status,
      })),
      sharedWithFamilyIds: view.sharedWithFamilyIds,
      createdAt: view.createdAt.toISOString(),
    };
  },

  toPlanSummaryDto(plan: Plan): PlanSummaryDto {
    return {
      id: plan.id,
      title: plan.title,
      scheduledAt: plan.scheduledAt?.toISOString(),
      placeName: plan.place?.name,
      ownerFamilyId: plan.ownerFamilyId,
      status: plan.status,
      participantCount: plan.participantCount(),
    };
  },

  toSavedPlaceDto(place: SavedPlace): SavedPlaceDto {
    return {
      id: place.id,
      name: place.name,
      address: place.address ?? undefined,
      lat: place.lat ?? undefined,
      lng: place.lng ?? undefined,
    };
  },
};
