/**
 * Fábrica de aplicación Nest para tests de integración.
 *
 * Construye una instancia completa del sistema (base de datos real, JWKS real
 * de Supabase local) con los mismos pipes y filtros globales que main.ts para
 * que las respuestas HTTP coincidan exactamente con producción.
 *
 * La arquitectura hexagonal del proyecto no tiene módulos Nest por contexto:
 * los providers se registran directamente en AppModule... pero AppModule solo
 * tiene HealthModule en la fase actual. Por eso este factory ensambla el
 * módulo de test a mano registrando todos los providers necesarios.
 */
import 'reflect-metadata';
import { json, urlencoded } from 'express';
import { AppZodValidationPipe } from '../../src/common/zod-validation.pipe';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { validateEnv, type Env } from '../../src/config/env.config';
import { DRIZZLE, PG_POOL } from '../../src/db/drizzle.tokens';
import * as schema from '../../src/db/schema';

// ── identity-access ────────────────────────────────────────────────────────
import { AuthController } from '../../src/contexts/identity-access/interface/auth.controller';
import { JwtAuthGuard } from '../../src/contexts/identity-access/interface/jwt-auth.guard';
import { AuthenticateRequestUseCase } from '../../src/contexts/identity-access/application/authenticate-request.use-case';
import { UpdateDisplayNameUseCase } from '../../src/contexts/identity-access/application/update-display-name.use-case';
import { DeleteAccountUseCase } from '../../src/contexts/identity-access/application/delete-account.use-case';
import { ExportPersonalDataUseCase } from '../../src/contexts/identity-access/application/export-personal-data.use-case';
import { DrizzleAppUserRepository } from '../../src/contexts/identity-access/infrastructure/drizzle-app-user.repository';
import { DrizzleAccountDeletionRepository } from '../../src/contexts/identity-access/infrastructure/drizzle-account-deletion.repository';
import { DrizzlePersonalDataExportRepository } from '../../src/contexts/identity-access/infrastructure/drizzle-personal-data-export.repository';
import { JoseTokenVerifier } from '../../src/contexts/identity-access/infrastructure/jose-token-verifier';
import {
  APP_USER_REPOSITORY,
} from '../../src/contexts/identity-access/domain/ports/app-user.repository';
import { ACCOUNT_DELETION_REPOSITORY } from '../../src/contexts/identity-access/domain/ports/account-deletion.repository';
import { PERSONAL_DATA_EXPORT_REPOSITORY } from '../../src/contexts/identity-access/domain/ports/personal-data-export.repository';
import { AUTH_USER_ADMIN } from '../../src/contexts/identity-access/domain/ports/auth-user-admin.port';
import { TOKEN_VERIFIER } from '../../src/contexts/identity-access/domain/ports/token-verifier';

// ── family ─────────────────────────────────────────────────────────────────
import { FamilyController } from '../../src/contexts/family/interface/family.controller';
import { FamilyScopeGuard } from '../../src/contexts/family/interface/family-scope.guard';

import { CreateFamilyUseCase } from '../../src/contexts/family/application/create-family.use-case';
import { ListMyFamiliesUseCase } from '../../src/contexts/family/application/list-my-families.use-case';
import { GenerateJoinPinUseCase } from '../../src/contexts/family/application/generate-join-pin.use-case';
import { JoinFamilyByPinUseCase } from '../../src/contexts/family/application/join-family-by-pin.use-case';
import { ListMembersUseCase } from '../../src/contexts/family/application/list-members.use-case';
import { LeaveFamilyUseCase } from '../../src/contexts/family/application/leave-family.use-case';
import { RevokeActivePinUseCase } from '../../src/contexts/family/application/revoke-active-pin.use-case';
import { UpdateFamilyUseCase } from '../../src/contexts/family/application/update-family.use-case';
import { DeleteFamilyUseCase } from '../../src/contexts/family/application/delete-family.use-case';
import { ExpelMemberUseCase } from '../../src/contexts/family/application/expel-member.use-case';
import { ChangeMemberRoleUseCase } from '../../src/contexts/family/application/change-member-role.use-case';

import {
  FAMILY_REPOSITORY,
} from '../../src/contexts/family/domain/ports/family.repository';
import { UNIT_OF_WORK } from '../../src/contexts/family/application/ports/unit-of-work';
import { HASHER } from '../../src/contexts/family/application/ports/hasher';
import { ID_GENERATOR } from '../../src/contexts/family/application/ports/id-generator';
import { CLOCK } from '../../src/contexts/family/application/ports/clock';
import { RANDOM_BYTES } from '../../src/contexts/family/application/ports/random-bytes';
import { MEMBERS_READ_MODEL } from '../../src/contexts/family/application/ports/members-read-model';

import { DrizzleFamilyRepository } from '../../src/contexts/family/infrastructure/drizzle-family.repository';
import { DrizzleUnitOfWork } from '../../src/contexts/family/infrastructure/drizzle-unit-of-work';
import {
  ScryptHasher,
  HASHER_PEPPER,
} from '../../src/contexts/family/infrastructure/scrypt-hasher';
import { UuidIdGenerator } from '../../src/contexts/family/infrastructure/uuid-id-generator';
import { SystemClock } from '../../src/contexts/family/infrastructure/system-clock';
import { CryptoRandomBytes } from '../../src/contexts/family/infrastructure/crypto-random-bytes';
import { DrizzleMembersReadModel } from '../../src/contexts/family/infrastructure/drizzle-members-read-model';


// ── shopping ───────────────────────────────────────────────────────────────
import { ShoppingListsController } from '../../src/contexts/shopping/interface/shopping-lists.controller';
import { ShoppingItemsController } from '../../src/contexts/shopping/interface/shopping-items.controller';
import { ListScopeGuard } from '../../src/contexts/shopping/interface/list-scope.guard';
import { ItemScopeGuard } from '../../src/contexts/shopping/interface/item-scope.guard';

// ── ai ─────────────────────────────────────────────────────────────────────
import { AiController } from '../../src/contexts/ai/interface/ai.controller';
import { EMBEDDING_PORT } from '../../src/contexts/ai/domain/ports/embedding.port';
import { ITEM_EXTRACTION_PORT } from '../../src/contexts/ai/domain/ports/item-extraction.port';
import { PLAN_PARSING_PORT } from '../../src/contexts/ai/domain/ports/plan-parsing.port';
import { CATALOG_ITEM_REPOSITORY } from '../../src/contexts/ai/domain/ports/catalog-item.repository';
import { DrizzleCatalogItemRepository } from '../../src/contexts/ai/infrastructure/drizzle-catalog-item.repository';
import { ExtractItemsUseCase } from '../../src/contexts/ai/application/extract-items.use-case';
import { DedupCheckUseCase } from '../../src/contexts/ai/application/dedup-check.use-case';
import { UpsertCatalogItemUseCase } from '../../src/contexts/ai/application/upsert-catalog-item.use-case';
import { GetFrequentItemsUseCase } from '../../src/contexts/ai/application/get-frequent-items.use-case';
import { ParsePlanUseCase } from '../../src/contexts/ai/application/parse-plan.use-case';

import { EnsureAndListListsUseCase } from '../../src/contexts/shopping/application/ensure-and-list-lists.use-case';
import { CreateCustomListUseCase } from '../../src/contexts/shopping/application/create-custom-list.use-case';
import { GetListWithItemsUseCase } from '../../src/contexts/shopping/application/get-list-with-items.use-case';
import { AddItemUseCase } from '../../src/contexts/shopping/application/add-item.use-case';
import { AddItemToListUseCase } from '../../src/contexts/shopping/application/add-item-to-list.use-case';
import { ToggleItemCheckedUseCase } from '../../src/contexts/shopping/application/toggle-item-checked.use-case';
import { UpdateItemUseCase } from '../../src/contexts/shopping/application/update-item.use-case';
import { DeleteItemUseCase } from '../../src/contexts/shopping/application/delete-item.use-case';
import { DeleteCustomListUseCase } from '../../src/contexts/shopping/application/delete-custom-list.use-case';
import { AddCommentUseCase } from '../../src/contexts/shopping/application/add-comment.use-case';
import { ListCommentsUseCase } from '../../src/contexts/shopping/application/list-comments.use-case';

import {
  SHOPPING_LIST_REPOSITORY,
} from '../../src/contexts/shopping/domain/ports/shopping-list.repository';
import {
  SHOPPING_ITEM_REPOSITORY,
} from '../../src/contexts/shopping/domain/ports/shopping-item.repository';
import {
  ITEM_COMMENT_REPOSITORY,
} from '../../src/contexts/shopping/domain/ports/item-comment.repository';
import { SHOPPING_CLOCK } from '../../src/contexts/shopping/application/ports/clock';
import { SHOPPING_ID_GENERATOR } from '../../src/contexts/shopping/application/ports/id-generator';

import { DrizzleShoppingListRepository } from '../../src/contexts/shopping/infrastructure/drizzle-shopping-list.repository';
import { DrizzleShoppingItemRepository } from '../../src/contexts/shopping/infrastructure/drizzle-shopping-item.repository';
import { DrizzleItemCommentRepository } from '../../src/contexts/shopping/infrastructure/drizzle-item-comment.repository';

// ── fridge ─────────────────────────────────────────────────────────────────
import { FridgeController } from '../../src/contexts/fridge/interface/fridge.controller';
import { FridgeItemScopeGuard } from '../../src/contexts/fridge/interface/fridge-item-scope.guard';
import { FRIDGE_ITEM_REPOSITORY } from '../../src/contexts/fridge/domain/ports/fridge-item.repository';
import { FRIDGE_CLOCK } from '../../src/contexts/fridge/application/ports/clock';
import { FRIDGE_ID_GENERATOR } from '../../src/contexts/fridge/application/ports/id-generator';
import { DrizzleFridgeItemRepository } from '../../src/contexts/fridge/infrastructure/drizzle-fridge-item.repository';
import { AddFridgeItemUseCase } from '../../src/contexts/fridge/application/add-fridge-item.use-case';
import { ListFridgeItemsUseCase } from '../../src/contexts/fridge/application/list-fridge-items.use-case';
import { GetFridgeItemUseCase } from '../../src/contexts/fridge/application/get-fridge-item.use-case';
import { UpdateFridgeItemUseCase } from '../../src/contexts/fridge/application/update-fridge-item.use-case';
import { DeleteFridgeItemUseCase } from '../../src/contexts/fridge/application/delete-fridge-item.use-case';
import { EatFridgeItemUseCase } from '../../src/contexts/fridge/application/eat-fridge-item.use-case';
import { ThrowFridgeItemUseCase } from '../../src/contexts/fridge/application/throw-fridge-item.use-case';
import { FreezeFridgeItemUseCase } from '../../src/contexts/fridge/application/freeze-fridge-item.use-case';
import { ThawFridgeItemUseCase } from '../../src/contexts/fridge/application/thaw-fridge-item.use-case';
import { GetExpiringSoonUseCase } from '../../src/contexts/fridge/application/get-expiring-soon.use-case';

// ── notifications ──────────────────────────────────────────────────────────
import { NotificationsController } from '../../src/contexts/notifications/interface/notifications.controller';
import { PUSH_SUBSCRIPTION_REPOSITORY } from '../../src/contexts/notifications/domain/ports/push-subscription.repository';
import { NOTIFICATION_SENDER } from '../../src/contexts/notifications/domain/ports/notification-sender.port';
import { NOTIFICATIONS_CLOCK } from '../../src/contexts/notifications/application/ports/clock';
import { NOTIFICATIONS_ID_GENERATOR } from '../../src/contexts/notifications/application/ports/id-generator';
import { DrizzlePushSubscriptionRepository } from '../../src/contexts/notifications/infrastructure/drizzle-push-subscription.repository';
import { SubscribePushUseCase } from '../../src/contexts/notifications/application/subscribe-push.use-case';
import { UnsubscribePushUseCase } from '../../src/contexts/notifications/application/unsubscribe-push.use-case';
import { ExpiryReminderService } from '../../src/contexts/notifications/application/expiry-reminder.service';

// ── stats ──────────────────────────────────────────────────────────────────
import { StatsController } from '../../src/contexts/stats/interface/stats.controller';
import { FamilyStatsQuery } from '../../src/contexts/stats/application/family-stats.query';

// ── calendar ───────────────────────────────────────────────────────────────
import { CalendarController } from '../../src/contexts/calendar/interface/calendar.controller';
import { EventScopeGuard } from '../../src/contexts/calendar/interface/event-scope.guard';
import { CALENDAR_EVENT_REPOSITORY } from '../../src/contexts/calendar/domain/ports/calendar-event.repository';
import { CALENDAR_SYNC_PORT } from '../../src/contexts/calendar/domain/ports/calendar-sync.port';
import { CALENDAR_CLOCK } from '../../src/contexts/calendar/application/ports/clock';
import { CALENDAR_ID_GENERATOR } from '../../src/contexts/calendar/application/ports/id-generator';
import { DrizzleCalendarEventRepository } from '../../src/contexts/calendar/infrastructure/drizzle-calendar-event.repository';
import { NoopCalendarSyncAdapter } from '../../src/contexts/calendar/infrastructure/noop-calendar-sync.adapter';
import { CreateEventUseCase } from '../../src/contexts/calendar/application/create-event.use-case';
import { GetEventUseCase } from '../../src/contexts/calendar/application/get-event.use-case';
import { ListEventsUseCase } from '../../src/contexts/calendar/application/list-events.use-case';
import { UpdateEventUseCase } from '../../src/contexts/calendar/application/update-event.use-case';
import { DeleteEventUseCase } from '../../src/contexts/calendar/application/delete-event.use-case';
import { SetAttendeesUseCase } from '../../src/contexts/calendar/application/set-attendees.use-case';

// ── groups ─────────────────────────────────────────────────────────────────
import { GroupsController } from '../../src/contexts/groups/interface/groups.controller';
import { GroupScopeGuard } from '../../src/contexts/groups/interface/group-scope.guard';
import { GROUP_REPOSITORY } from '../../src/contexts/groups/domain/ports/group.repository';
import { GROUP_UNIT_OF_WORK } from '../../src/contexts/groups/application/ports/unit-of-work';
import { GROUP_MEMBERS_READ_MODEL } from '../../src/contexts/groups/application/ports/group-members-read-model';
import { DrizzleGroupRepository } from '../../src/contexts/groups/infrastructure/drizzle-group.repository';
import { DrizzleGroupUnitOfWork } from '../../src/contexts/groups/infrastructure/drizzle-group-unit-of-work';
import { DrizzleGroupMembersReadModel } from '../../src/contexts/groups/infrastructure/drizzle-group-members-read-model';
import { CreateGroupUseCase } from '../../src/contexts/groups/application/create-group.use-case';
import { ListMyGroupsUseCase } from '../../src/contexts/groups/application/list-my-groups.use-case';
import { GenerateGroupJoinPinUseCase } from '../../src/contexts/groups/application/generate-group-join-pin.use-case';
import { JoinGroupByPinUseCase } from '../../src/contexts/groups/application/join-group-by-pin.use-case';
import { ListGroupMembersUseCase } from '../../src/contexts/groups/application/list-group-members.use-case';
import { LeaveGroupUseCase } from '../../src/contexts/groups/application/leave-group.use-case';
import { RevokeActiveGroupPinUseCase } from '../../src/contexts/groups/application/revoke-active-group-pin.use-case';
import { UpdateGroupUseCase } from '../../src/contexts/groups/application/update-group.use-case';
import { DeleteGroupUseCase } from '../../src/contexts/groups/application/delete-group.use-case';
import { ExpelGroupMemberUseCase } from '../../src/contexts/groups/application/expel-group-member.use-case';
import { ChangeGroupMemberRoleUseCase } from '../../src/contexts/groups/application/change-group-member-role.use-case';

// ── social ─────────────────────────────────────────────────────────────────
import { SocialController } from '../../src/contexts/social/interface/social.controller';
import { FRIEND_INVITE_PIN_REPOSITORY } from '../../src/contexts/social/domain/ports/friend-invite-pin.repository';
import { FRIEND_LINK_REPOSITORY } from '../../src/contexts/social/domain/ports/friend-link.repository';
import { SOCIAL_UNIT_OF_WORK } from '../../src/contexts/social/application/ports/unit-of-work';
import { SOCIAL_READ_MODEL } from '../../src/contexts/social/application/ports/social-read-model';
import { DrizzleFriendInvitePinRepository } from '../../src/contexts/social/infrastructure/drizzle-friend-invite-pin.repository';
import { DrizzleFriendLinkRepository } from '../../src/contexts/social/infrastructure/drizzle-friend-link.repository';
import { DrizzleSocialReadModel } from '../../src/contexts/social/infrastructure/drizzle-social-read-model';
import { DrizzleSocialUnitOfWork } from '../../src/contexts/social/infrastructure/drizzle-social-unit-of-work';
import { GenerateFriendInviteUseCase } from '../../src/contexts/social/application/generate-friend-invite.use-case';
import { RedeemFriendInviteUseCase } from '../../src/contexts/social/application/redeem-friend-invite.use-case';
import { ListFriendFamiliesUseCase } from '../../src/contexts/social/application/list-friend-families.use-case';
import { RemoveFriendFamilyUseCase } from '../../src/contexts/social/application/remove-friend-family.use-case';

// ── plans ──────────────────────────────────────────────────────────────────
import { PlansController } from '../../src/contexts/plans/interface/plans.controller';
import { PLAN_REPOSITORY } from '../../src/contexts/plans/domain/ports/plan.repository';
import { SAVED_PLACE_REPOSITORY } from '../../src/contexts/plans/domain/ports/saved-place.repository';
import { PLAN_MESSAGE_REPOSITORY } from '../../src/contexts/plans/domain/ports/plan-message.repository';
import { PLANS_READ_MODEL } from '../../src/contexts/plans/application/ports/plans-read-model';
import { DrizzlePlanRepository } from '../../src/contexts/plans/infrastructure/drizzle-plan.repository';
import { DrizzleSavedPlaceRepository } from '../../src/contexts/plans/infrastructure/drizzle-saved-place.repository';
import { DrizzlePlanMessageRepository } from '../../src/contexts/plans/infrastructure/drizzle-plan-message.repository';
import { DrizzlePlansReadModel } from '../../src/contexts/plans/infrastructure/drizzle-plans-read-model';
import { CreatePlanUseCase } from '../../src/contexts/plans/application/create-plan.use-case';
import { ListPlansUseCase } from '../../src/contexts/plans/application/list-plans.use-case';
import { GetPlanUseCase } from '../../src/contexts/plans/application/get-plan.use-case';
import { UpdatePlanUseCase } from '../../src/contexts/plans/application/update-plan.use-case';
import { DeletePlanUseCase } from '../../src/contexts/plans/application/delete-plan.use-case';
import { SharePlanUseCase } from '../../src/contexts/plans/application/share-plan.use-case';
import { SetRsvpUseCase } from '../../src/contexts/plans/application/set-rsvp.use-case';
import { CreateSavedPlaceUseCase } from '../../src/contexts/plans/application/create-saved-place.use-case';
import { ListSavedPlacesUseCase } from '../../src/contexts/plans/application/list-saved-places.use-case';
import { DeleteSavedPlaceUseCase } from '../../src/contexts/plans/application/delete-saved-place.use-case';
import { ListPlanMessagesUseCase } from '../../src/contexts/plans/application/list-plan-messages.use-case';
import { SendPlanMessageUseCase } from '../../src/contexts/plans/application/send-plan-message.use-case';

// ── romantic ───────────────────────────────────────────────────────────────
import { RomanticController } from '../../src/contexts/romantic/interface/romantic.controller';
import { CoupleScopeGuard } from '../../src/contexts/romantic/interface/couple-scope.guard';
import { COUPLE_REPOSITORY } from '../../src/contexts/romantic/domain/ports/couple.repository';
import { COUPLE_NOTE_REPOSITORY } from '../../src/contexts/romantic/domain/ports/couple-note.repository';
import { COUPLE_CHALLENGE_REPOSITORY } from '../../src/contexts/romantic/domain/ports/couple-challenge.repository';
import { ROMANTIC_CLOCK } from '../../src/contexts/romantic/application/ports/clock';
import { ROMANTIC_ID_GENERATOR } from '../../src/contexts/romantic/application/ports/id-generator';
import { DrizzleCoupleRepository } from '../../src/contexts/romantic/infrastructure/drizzle-couple.repository';
import { DrizzleCoupleNoteRepository } from '../../src/contexts/romantic/infrastructure/drizzle-couple-note.repository';
import { DrizzleCoupleChallengeRepository } from '../../src/contexts/romantic/infrastructure/drizzle-couple-challenge.repository';
import { CreateCoupleUseCase } from '../../src/contexts/romantic/application/create-couple.use-case';
import { GetMyCoupleUseCase } from '../../src/contexts/romantic/application/get-my-couple.use-case';
import { DissolveCoupleUseCase } from '../../src/contexts/romantic/application/dissolve-couple.use-case';
import { CreateCoupleNoteUseCase } from '../../src/contexts/romantic/application/create-couple-note.use-case';
import { ListCoupleNotesUseCase } from '../../src/contexts/romantic/application/list-couple-notes.use-case';
import { DeleteCoupleNoteUseCase } from '../../src/contexts/romantic/application/delete-couple-note.use-case';
import { AddChallengeUseCase } from '../../src/contexts/romantic/application/add-challenge.use-case';
import { ListChallengesUseCase } from '../../src/contexts/romantic/application/list-challenges.use-case';
import { ListChallengeCatalogUseCase } from '../../src/contexts/romantic/application/list-challenge-catalog.use-case';
import { MarkChallengeDoneUseCase } from '../../src/contexts/romantic/application/mark-challenge-done.use-case';
import { DoMischiefUseCase } from '../../src/contexts/romantic/application/do-mischief.use-case';

// ── budget ─────────────────────────────────────────────────────────────────
import { BudgetController } from '../../src/contexts/budget/interface/budget.controller';
import { ReceiptScopeGuard } from '../../src/contexts/budget/interface/receipt-scope.guard';
import { RECEIPT_REPOSITORY } from '../../src/contexts/budget/domain/ports/receipt.repository';
import { RECEIPT_OCR_PORT } from '../../src/contexts/budget/domain/ports/receipt-ocr.port';
import { BUDGET_CLOCK } from '../../src/contexts/budget/application/ports/clock';
import { BUDGET_ID_GENERATOR } from '../../src/contexts/budget/application/ports/id-generator';
import { DrizzleReceiptRepository } from '../../src/contexts/budget/infrastructure/drizzle-receipt.repository';
import { AiUnavailableError } from '../../src/contexts/budget/domain/budget.errors';
import { ExtractReceiptUseCase } from '../../src/contexts/budget/application/extract-receipt.use-case';
import { CreateReceiptUseCase } from '../../src/contexts/budget/application/create-receipt.use-case';
import { ListReceiptsUseCase } from '../../src/contexts/budget/application/list-receipts.use-case';
import { GetReceiptUseCase } from '../../src/contexts/budget/application/get-receipt.use-case';
import { UpdateReceiptUseCase } from '../../src/contexts/budget/application/update-receipt.use-case';
import { DeleteReceiptUseCase } from '../../src/contexts/budget/application/delete-receipt.use-case';
import { GetSpendSummaryUseCase } from '../../src/contexts/budget/application/get-spend-summary.use-case';
import { RateLimitGuard } from '../../src/common/rate-limit.guard';
import { Reflector } from '@nestjs/core';

// ── menu ────────────────────────────────────────────────────────────────────
import { MenuController } from '../../src/contexts/menu/interface/menu.controller';
import { MENU_SUGGESTION_PORT } from '../../src/contexts/menu/domain/ports/menu-suggestion.port';
import { MenuAiUnavailableError } from '../../src/contexts/menu/domain/menu.errors';
import { SuggestMenuUseCase } from '../../src/contexts/menu/application/suggest-menu.use-case';
import { GenerateListFromMenuUseCase } from '../../src/contexts/menu/application/generate-list-from-menu.use-case';
import { RECIPE_REPOSITORY } from '../../src/contexts/menu/domain/ports/recipe.repository';
import { DrizzleRecipeRepository } from '../../src/contexts/menu/infrastructure/drizzle-recipe.repository';
import { MENU_CLOCK } from '../../src/contexts/menu/application/ports/clock';
import { MENU_ID_GENERATOR } from '../../src/contexts/menu/application/ports/id-generator';
import { CreateRecipeUseCase } from '../../src/contexts/menu/application/create-recipe.use-case';
import { ListRecipesUseCase } from '../../src/contexts/menu/application/list-recipes.use-case';
import { DeleteRecipeUseCase } from '../../src/contexts/menu/application/delete-recipe.use-case';
import { CheckRecipeAvailabilityUseCase } from '../../src/contexts/menu/application/check-recipe-availability.use-case';

// ── tasks ──────────────────────────────────────────────────────────────────
import { TasksController } from '../../src/contexts/tasks/interface/tasks.controller';
import { TaskScopeGuard } from '../../src/contexts/tasks/interface/task-scope.guard';
import { TASK_REPOSITORY } from '../../src/contexts/tasks/domain/ports/task.repository';
import { TASK_PHOTO_REPOSITORY } from '../../src/contexts/tasks/domain/ports/task-photo.repository';
import { TASK_COMMENT_REPOSITORY } from '../../src/contexts/tasks/domain/ports/task-comment.repository';
import { TASKS_CLOCK } from '../../src/contexts/tasks/application/ports/clock';
import { TASKS_ID_GENERATOR } from '../../src/contexts/tasks/application/ports/id-generator';
import { DrizzleTaskRepository } from '../../src/contexts/tasks/infrastructure/drizzle-task.repository';
import { DrizzleTaskPhotoRepository } from '../../src/contexts/tasks/infrastructure/drizzle-task-photo.repository';
import { DrizzleTaskCommentRepository } from '../../src/contexts/tasks/infrastructure/drizzle-task-comment.repository';
import { TaskAssigneesReadModel } from '../../src/contexts/tasks/infrastructure/task-assignees-read-model';
import { CreateTaskUseCase } from '../../src/contexts/tasks/application/create-task.use-case';
import { GetTaskUseCase } from '../../src/contexts/tasks/application/get-task.use-case';
import { ListTasksUseCase } from '../../src/contexts/tasks/application/list-tasks.use-case';
import { UpdateTaskUseCase } from '../../src/contexts/tasks/application/update-task.use-case';
import { DeleteTaskUseCase } from '../../src/contexts/tasks/application/delete-task.use-case';
import { SetAssigneesUseCase } from '../../src/contexts/tasks/application/set-assignees.use-case';
import { AddTaskPhotoUseCase } from '../../src/contexts/tasks/application/add-task-photo.use-case';
import { RemoveTaskPhotoUseCase } from '../../src/contexts/tasks/application/remove-task-photo.use-case';
import { GenerateListFromTaskUseCase } from '../../src/contexts/tasks/application/generate-list-from-task.use-case';
import { AddTaskCommentUseCase } from '../../src/contexts/tasks/application/add-task-comment.use-case';
import { ListTaskCommentsUseCase } from '../../src/contexts/tasks/application/list-task-comments.use-case';

// ── routines ────────────────────────────────────────────────────────────────
import { RoutinesController } from '../../src/contexts/routines/interface/routines.controller';
import { RoutineScopeGuard } from '../../src/contexts/routines/interface/routine-scope.guard';
import { RoutineItemScopeGuard } from '../../src/contexts/routines/interface/routine-item-scope.guard';
import { ROUTINE_REPOSITORY } from '../../src/contexts/routines/domain/ports/routine.repository';
import { ROUTINE_ITEM_REPOSITORY } from '../../src/contexts/routines/domain/ports/routine-item.repository';
import { ROUTINES_CLOCK } from '../../src/contexts/routines/application/ports/clock';
import { ROUTINES_ID_GENERATOR } from '../../src/contexts/routines/application/ports/id-generator';
import { DrizzleRoutineRepository } from '../../src/contexts/routines/infrastructure/drizzle-routine.repository';
import { DrizzleRoutineItemRepository } from '../../src/contexts/routines/infrastructure/drizzle-routine-item.repository';
import { CreateRoutineItemUseCase } from '../../src/contexts/routines/application/create-routine-item.use-case';
import { ListRoutineItemsUseCase } from '../../src/contexts/routines/application/list-routine-items.use-case';
import { UpdateRoutineItemUseCase } from '../../src/contexts/routines/application/update-routine-item.use-case';
import { DeleteRoutineItemUseCase } from '../../src/contexts/routines/application/delete-routine-item.use-case';
import { CreateRoutineUseCase } from '../../src/contexts/routines/application/create-routine.use-case';
import { ListRoutinesUseCase } from '../../src/contexts/routines/application/list-routines.use-case';
import { GetRoutineUseCase } from '../../src/contexts/routines/application/get-routine.use-case';
import { UpdateRoutineUseCase } from '../../src/contexts/routines/application/update-routine.use-case';
import { DeleteRoutineUseCase } from '../../src/contexts/routines/application/delete-routine.use-case';
import { SetRoutineItemsUseCase } from '../../src/contexts/routines/application/set-routine-items.use-case';
import { GetRoutineSummaryUseCase } from '../../src/contexts/routines/application/get-routine-summary.use-case';
import { CreateAssignmentUseCase } from '../../src/contexts/routines/application/create-assignment.use-case';
import { UpdateAssignmentUseCase } from '../../src/contexts/routines/application/update-assignment.use-case';
import { DeleteAssignmentUseCase } from '../../src/contexts/routines/application/delete-assignment.use-case';
import { CreateIncidentUseCase } from '../../src/contexts/routines/application/create-incident.use-case';
import { UpdateIncidentUseCase } from '../../src/contexts/routines/application/update-incident.use-case';
import { DeleteIncidentUseCase } from '../../src/contexts/routines/application/delete-incident.use-case';
import { RoutineStatsQuery } from '../../src/contexts/routines/application/routine-stats.query';

export interface TestApp {
  app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any;
}

/**
 * Crea y levanta la aplicación Nest de integración.
 * Reutiliza la misma instancia si se llama varias veces en el mismo proceso
 * (las suites comparten la instancia para no pagar el coste de init por suite).
 */
let cachedApp: TestApp | undefined;

export async function createTestApp(): Promise<TestApp> {
  if (cachedApp) {
    return cachedApp;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        validate: validateEnv,
        cache: true,
        // El .env ya fue cargado por setup-env.ts; ConfigModule lo leerá
        // de process.env sin necesidad de especificar envFilePath.
        ignoreEnvFile: true,
      }),
      ScheduleModule.forRoot(),
    ],
    controllers: [FamilyController, AuthController, GroupsController, SocialController, PlansController, ShoppingListsController, ShoppingItemsController, AiController, TasksController, FridgeController, NotificationsController, StatsController, CalendarController, RomanticController, BudgetController, MenuController, RoutinesController],
    providers: [
      // ── DB ─────────────────────────────────────────────────────────────
      {
        provide: PG_POOL,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>): Pool => {
          const connectionString = config.get('DATABASE_URL', { infer: true });
          if (!connectionString) {
            throw new Error('DATABASE_URL es obligatoria para los tests de integración.');
          }
          return new Pool({ connectionString, max: 5 });
        },
      },
      {
        provide: DRIZZLE,
        inject: [PG_POOL],
        useFactory: (pool: Pool) => drizzle(pool, { schema, casing: 'snake_case' }),
      },

      // ── identity-access ────────────────────────────────────────────────
      {
        // Integración: usa el Supabase local (JWKS asimétrico) vía fromConfig.
        provide: TOKEN_VERIFIER,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>) => JoseTokenVerifier.fromConfig(config),
      },
      DrizzleAppUserRepository,
      {
        provide: APP_USER_REPOSITORY,
        useExisting: DrizzleAppUserRepository,
      },
      {
        provide: ACCOUNT_DELETION_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleAccountDeletionRepository(
            db as Parameters<typeof DrizzleAccountDeletionRepository.prototype.constructor>[0],
          ),
      },
      {
        provide: PERSONAL_DATA_EXPORT_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzlePersonalDataExportRepository(
            db as Parameters<typeof DrizzlePersonalDataExportRepository.prototype.constructor>[0],
          ),
      },
      {
        // Service-role stub no-op en tests: la baja de DATOS sí se ejecuta; el
        // borrado en Supabase Auth se omite (no hay service-role en integración).
        provide: AUTH_USER_ADMIN,
        useValue: {
          deleteAuthUser: async () => undefined,
        },
      },
      AuthenticateRequestUseCase,
      UpdateDisplayNameUseCase,
      DeleteAccountUseCase,
      ExportPersonalDataUseCase,
      JwtAuthGuard,

      // ── family: infraestructura ─────────────────────────────────────────
      {
        provide: HASHER_PEPPER,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>): string => {
          return config.get('JOIN_PIN_PEPPER', { infer: true }) ?? 'dev-only-join-pin-pepper-change-me';
        },
      },
      ScryptHasher,
      {
        provide: HASHER,
        useExisting: ScryptHasher,
      },
      DrizzleUnitOfWork,
      {
        provide: UNIT_OF_WORK,
        useExisting: DrizzleUnitOfWork,
      },
      UuidIdGenerator,
      {
        provide: ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },
      SystemClock,
      {
        provide: CLOCK,
        useExisting: SystemClock,
      },
      CryptoRandomBytes,
      {
        provide: RANDOM_BYTES,
        useExisting: CryptoRandomBytes,
      },
      DrizzleMembersReadModel,
      {
        provide: MEMBERS_READ_MODEL,
        useExisting: DrizzleMembersReadModel,
      },
      {
        provide: FAMILY_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleFamilyRepository(db as Parameters<typeof DrizzleFamilyRepository.prototype.constructor>[0]),
      },
      FamilyScopeGuard,

      // ── family: casos de uso ───────────────────────────────────────────
      CreateFamilyUseCase,
      ListMyFamiliesUseCase,
      GenerateJoinPinUseCase,
      JoinFamilyByPinUseCase,
      ListMembersUseCase,
      LeaveFamilyUseCase,
      RevokeActivePinUseCase,
      UpdateFamilyUseCase,
      DeleteFamilyUseCase,
      ExpelMemberUseCase,
      ChangeMemberRoleUseCase,

      // ── groups: infraestructura ────────────────────────────────────────
      DrizzleGroupUnitOfWork,
      { provide: GROUP_UNIT_OF_WORK, useExisting: DrizzleGroupUnitOfWork },

      DrizzleGroupMembersReadModel,
      { provide: GROUP_MEMBERS_READ_MODEL, useExisting: DrizzleGroupMembersReadModel },

      {
        provide: GROUP_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleGroupRepository(db as Parameters<typeof DrizzleGroupRepository.prototype.constructor>[0]),
      },

      GroupScopeGuard,

      // ── groups: casos de uso ───────────────────────────────────────────
      CreateGroupUseCase,
      ListMyGroupsUseCase,
      GenerateGroupJoinPinUseCase,
      JoinGroupByPinUseCase,
      ListGroupMembersUseCase,
      LeaveGroupUseCase,
      RevokeActiveGroupPinUseCase,
      UpdateGroupUseCase,
      DeleteGroupUseCase,
      ExpelGroupMemberUseCase,
      ChangeGroupMemberRoleUseCase,

      // ── shopping: repositorios ─────────────────────────────────────────
      {
        provide: SHOPPING_LIST_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleShoppingListRepository(db as Parameters<typeof DrizzleShoppingListRepository.prototype.constructor>[0]),
      },
      {
        provide: SHOPPING_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleShoppingItemRepository(db as Parameters<typeof DrizzleShoppingItemRepository.prototype.constructor>[0]),
      },
      {
        provide: ITEM_COMMENT_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleItemCommentRepository(db as Parameters<typeof DrizzleItemCommentRepository.prototype.constructor>[0]),
      },

      // ── shopping: puertos de infra (reutiliza los de family) ──────────
      {
        provide: SHOPPING_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: SHOPPING_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── shopping: guards ───────────────────────────────────────────────
      ListScopeGuard,
      ItemScopeGuard,

      // ── shopping: casos de uso ─────────────────────────────────────────
      EnsureAndListListsUseCase,
      CreateCustomListUseCase,
      GetListWithItemsUseCase,
      AddItemUseCase,
      AddItemToListUseCase,
      ToggleItemCheckedUseCase,
      UpdateItemUseCase,
      DeleteItemUseCase,
      DeleteCustomListUseCase,
      AddCommentUseCase,
      ListCommentsUseCase,

      // ── ai: embedding port (stub determinista para tests) ─────────────
      // Usamos un stub con vector fijo en lugar del modelo real para evitar
      // descargar fastembed en CI y hacer los tests deterministas.
      {
        provide: EMBEDDING_PORT,
        useValue: {
          embed: async (text: string) => {
            // Vector determinista: hash simple basado en el texto (384 dims).
            // Textos idénticos → mismo vector; textos distintos → distinto.
            const hash = Array.from({ length: 384 }, (_, i) => {
              const charCode = text.charCodeAt(i % text.length) || 1;
              return (Math.sin(i + charCode) * 0.5 + 0.5);
            });
            return hash;
          },
        },
      },

      // ── ai: extracción de ítems (stub para tests) ─────────────────────
      {
        provide: ITEM_EXTRACTION_PORT,
        useValue: {
          extractItems: async (phrase: string) => {
            // Stub: divide por comas o "y"
            return phrase
              .split(/,|\sy\s/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          },
        },
      },

      // ── ai: catálogo ──────────────────────────────────────────────────
      {
        provide: CATALOG_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleCatalogItemRepository(db as Parameters<typeof DrizzleCatalogItemRepository.prototype.constructor>[0]),
      },

      // ── ai: autocompletado de plan (stub determinista para tests) ─────
      {
        provide: PLAN_PARSING_PORT,
        useValue: {
          parsePlan: async () => ({
            title: 'Plan',
            description: null,
            scheduledAt: null,
            placeQuery: null,
          }),
        },
      },

      // ── ai: casos de uso ──────────────────────────────────────────────
      ExtractItemsUseCase,
      DedupCheckUseCase,
      UpsertCatalogItemUseCase,
      GetFrequentItemsUseCase,
      ParsePlanUseCase,

      // ── tasks: repositorios ────────────────────────────────────────────
      {
        provide: TASK_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleTaskRepository(db as Parameters<typeof DrizzleTaskRepository.prototype.constructor>[0]),
      },
      {
        provide: TASK_PHOTO_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleTaskPhotoRepository(db as Parameters<typeof DrizzleTaskPhotoRepository.prototype.constructor>[0]),
      },
      {
        provide: TASK_COMMENT_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleTaskCommentRepository(db as Parameters<typeof DrizzleTaskCommentRepository.prototype.constructor>[0]),
      },

      // ── tasks: read-model ──────────────────────────────────────────────
      {
        provide: TaskAssigneesReadModel,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new TaskAssigneesReadModel(db as Parameters<typeof TaskAssigneesReadModel.prototype.constructor>[0]),
      },

      // ── tasks: puertos de infra (reutiliza los de family) ─────────────
      {
        provide: TASKS_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: TASKS_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── tasks: guards ──────────────────────────────────────────────────
      TaskScopeGuard,

      // ── tasks: casos de uso ────────────────────────────────────────────
      CreateTaskUseCase,
      GetTaskUseCase,
      ListTasksUseCase,
      UpdateTaskUseCase,
      DeleteTaskUseCase,
      SetAssigneesUseCase,
      AddTaskPhotoUseCase,
      RemoveTaskPhotoUseCase,
      GenerateListFromTaskUseCase,
      AddTaskCommentUseCase,
      ListTaskCommentsUseCase,

      // ── routines: repositorios ─────────────────────────────────────────
      {
        provide: ROUTINE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleRoutineRepository(db as Parameters<typeof DrizzleRoutineRepository.prototype.constructor>[0]),
      },
      {
        provide: ROUTINE_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleRoutineItemRepository(db as Parameters<typeof DrizzleRoutineItemRepository.prototype.constructor>[0]),
      },

      // ── routines: read-model de estadísticas ───────────────────────────
      RoutineStatsQuery,

      // ── routines: puertos de infra (reutiliza los de family) ───────────
      {
        provide: ROUTINES_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: ROUTINES_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── routines: guards ───────────────────────────────────────────────
      RoutineScopeGuard,
      RoutineItemScopeGuard,

      // ── routines: casos de uso ─────────────────────────────────────────
      CreateRoutineItemUseCase,
      ListRoutineItemsUseCase,
      UpdateRoutineItemUseCase,
      DeleteRoutineItemUseCase,
      CreateRoutineUseCase,
      ListRoutinesUseCase,
      GetRoutineUseCase,
      UpdateRoutineUseCase,
      DeleteRoutineUseCase,
      SetRoutineItemsUseCase,
      GetRoutineSummaryUseCase,
      CreateAssignmentUseCase,
      UpdateAssignmentUseCase,
      DeleteAssignmentUseCase,
      CreateIncidentUseCase,
      UpdateIncidentUseCase,
      DeleteIncidentUseCase,

      // ── fridge: repositorio ────────────────────────────────────────────
      {
        provide: FRIDGE_ITEM_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleFridgeItemRepository(db as Parameters<typeof DrizzleFridgeItemRepository.prototype.constructor>[0]),
      },

      // ── fridge: puertos de infra (reutiliza los de family) ─────────────
      {
        provide: FRIDGE_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: FRIDGE_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── fridge: guards ─────────────────────────────────────────────────
      FridgeItemScopeGuard,

      // ── fridge: casos de uso ───────────────────────────────────────────
      AddFridgeItemUseCase,
      ListFridgeItemsUseCase,
      GetFridgeItemUseCase,
      UpdateFridgeItemUseCase,
      DeleteFridgeItemUseCase,
      EatFridgeItemUseCase,
      ThrowFridgeItemUseCase,
      FreezeFridgeItemUseCase,
      ThawFridgeItemUseCase,
      GetExpiringSoonUseCase,

      // ── notifications: repositorio ─────────────────────────────────────
      {
        provide: PUSH_SUBSCRIPTION_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzlePushSubscriptionRepository(db as Parameters<typeof DrizzlePushSubscriptionRepository.prototype.constructor>[0]),
      },

      // ── notifications: sender (stub no-op en tests) ───────────────────
      {
        provide: NOTIFICATION_SENDER,
        useValue: {
          sendToTargets: async () => undefined,
        },
      },

      // ── notifications: puertos de infra ──────────────────────────────
      {
        provide: NOTIFICATIONS_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: NOTIFICATIONS_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── notifications: casos de uso ───────────────────────────────────
      SubscribePushUseCase,
      UnsubscribePushUseCase,

      // ── notifications: cron (no ejecuta en tests: sender es stub) ─────
      ExpiryReminderService,

      // ── stats: read-model ─────────────────────────────────────────────
      FamilyStatsQuery,

      // ── calendar: repositorio ──────────────────────────────────────────
      {
        provide: CALENDAR_EVENT_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleCalendarEventRepository(db as Parameters<typeof DrizzleCalendarEventRepository.prototype.constructor>[0]),
      },

      // ── calendar: sync port (no-op en tests) ──────────────────────────
      NoopCalendarSyncAdapter,
      {
        provide: CALENDAR_SYNC_PORT,
        useExisting: NoopCalendarSyncAdapter,
      },

      // ── calendar: puertos de infra (reutiliza los de family) ──────────
      {
        provide: CALENDAR_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: CALENDAR_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── calendar: guards ───────────────────────────────────────────────
      EventScopeGuard,

      // ── calendar: casos de uso ─────────────────────────────────────────
      CreateEventUseCase,
      GetEventUseCase,
      ListEventsUseCase,
      UpdateEventUseCase,
      DeleteEventUseCase,
      SetAttendeesUseCase,

      // ── romantic: repositorios ─────────────────────────────────────────
      {
        provide: COUPLE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleCoupleRepository(db as Parameters<typeof DrizzleCoupleRepository.prototype.constructor>[0]),
      },
      {
        provide: COUPLE_NOTE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleCoupleNoteRepository(db as Parameters<typeof DrizzleCoupleNoteRepository.prototype.constructor>[0]),
      },
      {
        provide: COUPLE_CHALLENGE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleCoupleChallengeRepository(db as Parameters<typeof DrizzleCoupleChallengeRepository.prototype.constructor>[0]),
      },

      // ── romantic: puertos de infra (reutiliza los de family) ──────────
      {
        provide: ROMANTIC_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: ROMANTIC_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── romantic: guards ───────────────────────────────────────────────
      CoupleScopeGuard,

      // ── romantic: casos de uso ─────────────────────────────────────────
      CreateCoupleUseCase,
      GetMyCoupleUseCase,
      DissolveCoupleUseCase,
      CreateCoupleNoteUseCase,
      ListCoupleNotesUseCase,
      DeleteCoupleNoteUseCase,
      AddChallengeUseCase,
      ListChallengesUseCase,
      ListChallengeCatalogUseCase,
      MarkChallengeDoneUseCase,
      DoMischiefUseCase,

      // ── social: infraestructura ────────────────────────────────────────
      DrizzleSocialUnitOfWork,
      { provide: SOCIAL_UNIT_OF_WORK, useExisting: DrizzleSocialUnitOfWork },
      DrizzleSocialReadModel,
      { provide: SOCIAL_READ_MODEL, useExisting: DrizzleSocialReadModel },
      {
        provide: FRIEND_INVITE_PIN_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleFriendInvitePinRepository(db as Parameters<typeof DrizzleFriendInvitePinRepository.prototype.constructor>[0]),
      },
      {
        provide: FRIEND_LINK_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleFriendLinkRepository(db as Parameters<typeof DrizzleFriendLinkRepository.prototype.constructor>[0]),
      },

      // ── social: casos de uso ────────────────────────────────────────────
      GenerateFriendInviteUseCase,
      RedeemFriendInviteUseCase,
      ListFriendFamiliesUseCase,
      RemoveFriendFamilyUseCase,

      // ── plans: infraestructura ─────────────────────────────────────────
      {
        provide: PLAN_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzlePlanRepository(db as Parameters<typeof DrizzlePlanRepository.prototype.constructor>[0]),
      },
      {
        provide: SAVED_PLACE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleSavedPlaceRepository(db as Parameters<typeof DrizzleSavedPlaceRepository.prototype.constructor>[0]),
      },
      {
        provide: PLAN_MESSAGE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzlePlanMessageRepository(db as Parameters<typeof DrizzlePlanMessageRepository.prototype.constructor>[0]),
      },
      DrizzlePlansReadModel,
      { provide: PLANS_READ_MODEL, useExisting: DrizzlePlansReadModel },

      // ── plans: casos de uso ────────────────────────────────────────────
      CreatePlanUseCase,
      ListPlansUseCase,
      GetPlanUseCase,
      UpdatePlanUseCase,
      DeletePlanUseCase,
      SharePlanUseCase,
      SetRsvpUseCase,
      CreateSavedPlaceUseCase,
      ListSavedPlacesUseCase,
      DeleteSavedPlaceUseCase,
      ListPlanMessagesUseCase,
      SendPlanMessageUseCase,

      // ── budget: repositorio ────────────────────────────────────────────
      {
        provide: RECEIPT_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleReceiptRepository(db as Parameters<typeof DrizzleReceiptRepository.prototype.constructor>[0]),
      },

      // ── budget: OCR port (stub → AiUnavailableError) ───────────────────
      {
        provide: RECEIPT_OCR_PORT,
        useValue: {
          extract: async () => {
            throw new AiUnavailableError('IA no configurada en tests.');
          },
        },
      },

      // ── budget: puertos de infra ──────────────────────────────────────
      {
        provide: BUDGET_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: BUDGET_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── budget: guards ────────────────────────────────────────────────
      ReceiptScopeGuard,
      Reflector,
      RateLimitGuard,

      // ── budget: casos de uso ──────────────────────────────────────────
      ExtractReceiptUseCase,
      CreateReceiptUseCase,
      ListReceiptsUseCase,
      GetReceiptUseCase,
      UpdateReceiptUseCase,
      DeleteReceiptUseCase,
      GetSpendSummaryUseCase,

      // ── menu: suggestion port (stub → MenuAiUnavailableError) ─────────
      {
        provide: MENU_SUGGESTION_PORT,
        useValue: {
          suggest: async () => {
            throw new MenuAiUnavailableError('IA no configurada en tests.');
          },
        },
      },

      // ── menu: recetas (repositorio + clock/id reutilizados) ────────────
      {
        provide: RECIPE_REPOSITORY,
        inject: [DRIZZLE],
        useFactory: (db: ReturnType<typeof drizzle>) =>
          new DrizzleRecipeRepository(db as Parameters<typeof DrizzleRecipeRepository.prototype.constructor>[0]),
      },
      {
        provide: MENU_CLOCK,
        useExisting: SystemClock,
      },
      {
        provide: MENU_ID_GENERATOR,
        useExisting: UuidIdGenerator,
      },

      // ── menu: casos de uso ────────────────────────────────────────────
      // CheckRecipeAvailabilityUseCase recibe el stub determinista de
      // EMBEDDING_PORT registrado más arriba (sección ai).
      SuggestMenuUseCase,
      GenerateListFromMenuUseCase,
      CreateRecipeUseCase,
      ListRecipesUseCase,
      DeleteRecipeUseCase,
      CheckRecipeAvailabilityUseCase,
    ],
  }).compile();

  const app = moduleRef.createNestApplication({ bodyParser: false });

  // Replica exacta de los globales de main.ts (sin Swagger, no lo necesitamos)
  // Body parser con el mismo límite que producción (5mb): el OCR de tickets
  // admite ~4 MB de base64; el límite por defecto de Express (100kb) daría 413.
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new AppZodValidationPipe());

  await app.init();

  const server = app.getHttpServer();
  cachedApp = { app, server };
  return cachedApp;
}

/** Cierra la app (pool de PG). Llamar en afterAll global. */
export async function closeTestApp(): Promise<void> {
  if (cachedApp) {
    await cachedApp.app.close();
    cachedApp = undefined;
  }
}
