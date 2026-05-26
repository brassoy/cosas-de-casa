import type { PlanStatus, PlanRsvpStatus, PlaceData } from '../../domain/plan';

export const PLANS_READ_MODEL = Symbol('PLANS_READ_MODEL');

export interface PlanParticipantView {
  userId: string;
  displayName: string | null;
  status: PlanRsvpStatus;
}

export interface PlanDetailView {
  id: string;
  ownerFamilyId: string;
  title: string;
  description: string | null;
  place: PlaceData | null;
  scheduledAt: Date | null;
  status: PlanStatus;
  createdBy: string;
  participants: PlanParticipantView[];
  sharedWithFamilyIds: string[];
  createdAt: Date;
}

export interface PlansReadModel {
  getPlanDetail(planId: string): Promise<PlanDetailView | null>;
}
