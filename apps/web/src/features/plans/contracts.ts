/**
 * Contratos del feature "planes rápidos" (plans).
 *
 * Re-exporta los tipos canónicos de @cosasdecasa/contracts.
 *
 * Endpoints (prefijo /api/v1 lo añade el cliente api):
 *   POST   /families/:familyId/plans                   → PlanDto (201)
 *   GET    /families/:familyId/plans                   → PlanSummaryDto[]
 *   GET    /plans/:planId                              → PlanDto
 *   PATCH  /plans/:planId                              → PlanDto
 *   DELETE /plans/:planId                              → void (204)
 *   POST   /plans/:planId/share { familyId }           → PlanDto (200)
 *   POST   /plans/:planId/rsvp { status }              → PlanDto (200)
 *   GET    /families/:familyId/places                  → SavedPlaceDto[]
 *   POST   /families/:familyId/places                  → SavedPlaceDto (201)
 *   DELETE /places/:placeId                            → void (204)
 *   GET    /plans/:planId/messages?before=ISO          → PlanMessageDto[]
 *   POST   /plans/:planId/messages { body }            → PlanMessageDto (201)
 */

export type {
  PlanRsvpStatus,
  PlanStatus,
  PlaceDto,
  SavedPlaceDto,
  PlanParticipantDto,
  PlanSummaryDto,
  PlanDto,
  CreatePlanInput,
  UpdatePlanInput,
  SetRsvpInput,
  SharePlanInput,
  PlanMessageDto,
  SendMessageInput,
} from '@cosasdecasa/contracts';
