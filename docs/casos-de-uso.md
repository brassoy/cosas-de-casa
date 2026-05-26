# Catálogo de casos de uso

Índice maestro de los **88 casos de uso** de la API (`apps/api`), más las **2 consultas de
lectura** del read-model de `stats`. Cada caso de uso es una clase `@Injectable()` en
`src/contexts/{contexto}/application/*.use-case.ts` con un método `execute(command)`.

Este catálogo es el punto de referencia para verificar la API: define **qué debe hacer cada
caso de uso**. La ficha detallada de cada uno (entrada, salida, reglas, errores) vive en el
documento de su módulo, en la sección **Casos de uso**. La coherencia de los contratos de
entrada/salida se audita en [`auditoria/contratos.md`](./auditoria/contratos.md).

> Las rutas se sirven bajo el prefijo global `/api/v1`. La columna **Autorización** indica los
> guards aplicados y quién puede ejecutar la acción. Todos los endpoints exigen `JwtAuthGuard`
> salvo `GET /health`.

| Contexto | Casos | Módulo |
|---|---|---|
| identity-access | 1 | [identity-access.md](./modules/identity-access.md) |
| family | 7 | [family.md](./modules/family.md) |
| groups | 7 | [groups.md](./modules/groups.md) |
| social | 4 | [social.md](./modules/social.md) |
| shopping | 10 | [shopping.md](./modules/shopping.md) |
| ai | 4 | [ai.md](./modules/ai.md) |
| menu | 2 | [menu.md](./modules/menu.md) |
| fridge | 9 | [fridge.md](./modules/fridge.md) |
| tasks | 9 | [tasks.md](./modules/tasks.md) |
| calendar | 6 | [calendar.md](./modules/calendar.md) |
| plans | 12 | [plans.md](./modules/plans.md) |
| budget | 7 | [budget.md](./modules/budget.md) |
| romantic | 8 | [romantic.md](./modules/romantic.md) |
| notifications | 2 | [notifications.md](./modules/notifications.md) |
| stats | 2 consultas | [stats.md](./modules/stats.md) |

---

## identity-access

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `AuthenticateRequestUseCase` | Interno (no expone endpoint; provisión JIT de `app_users`) | — |

## family

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `CreateFamilyUseCase` | `POST /families` | JwtAuthGuard (cualquier usuario) |
| `ListMyFamiliesUseCase` | `GET /families` | JwtAuthGuard (cualquier usuario) |
| `JoinFamilyByPinUseCase` | `POST /families/join` | JwtAuthGuard (cualquier usuario) |
| `GenerateJoinPinUseCase` | `POST /families/:id/join-pins` | JwtAuthGuard + FamilyScopeGuard + Roles(OWNER) |
| `RevokeActivePinUseCase` | `DELETE /families/:id/join-pins/active` | JwtAuthGuard + FamilyScopeGuard + Roles(OWNER) |
| `ListMembersUseCase` | `GET /families/:id/members` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `LeaveFamilyUseCase` | `DELETE /families/:id/members/me` | JwtAuthGuard + FamilyScopeGuard (miembro) |

## groups

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `CreateGroupUseCase` | `POST /groups` | JwtAuthGuard (cualquier usuario) |
| `ListMyGroupsUseCase` | `GET /groups` | JwtAuthGuard (cualquier usuario) |
| `JoinGroupByPinUseCase` | `POST /groups/join` | JwtAuthGuard (cualquier usuario) |
| `GenerateGroupJoinPinUseCase` | `POST /groups/:id/join-pins` | JwtAuthGuard + GroupScopeGuard + GroupRoles(OWNER) |
| `RevokeActiveGroupPinUseCase` | `DELETE /groups/:id/join-pins/active` | JwtAuthGuard + GroupScopeGuard + GroupRoles(OWNER) |
| `ListGroupMembersUseCase` | `GET /groups/:id/members` | JwtAuthGuard + GroupScopeGuard (miembro) |
| `LeaveGroupUseCase` | `DELETE /groups/:id/members/me` | JwtAuthGuard + GroupScopeGuard (miembro) |

## social

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `GenerateFriendInviteUseCase` | `POST /families/:familyId/friend-invites` | JwtAuthGuard (OWNER, verificado en el use case) |
| `RedeemFriendInviteUseCase` | `POST /friends/redeem` | JwtAuthGuard (miembro de la familia indicada) |
| `ListFriendFamiliesUseCase` | `GET /families/:familyId/friends` | JwtAuthGuard (miembro) |
| `RemoveFriendFamilyUseCase` | `DELETE /friends/:linkId` | JwtAuthGuard (miembro de alguna de las dos familias) |

## shopping

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `EnsureAndListListsUseCase` | `GET /families/:familyId/lists` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `CreateCustomListUseCase` | `POST /families/:familyId/lists` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetListWithItemsUseCase` | `GET /lists/:listId` | JwtAuthGuard + ListScopeGuard (miembro de la familia de la lista) |
| `AddItemUseCase` | `POST /lists/:listId/items` | JwtAuthGuard + ListScopeGuard (miembro) |
| `UpdateItemUseCase` | `PATCH /items/:itemId` | JwtAuthGuard + ItemScopeGuard (miembro de la familia del ítem) |
| `DeleteItemUseCase` | `DELETE /items/:itemId` | JwtAuthGuard + ItemScopeGuard |
| `DeleteCustomListUseCase` | `DELETE /lists/:listId` | JwtAuthGuard + ListScopeGuard |
| `AddCommentUseCase` | `POST /items/:itemId/comments` | JwtAuthGuard + ItemScopeGuard |
| `ListCommentsUseCase` | `GET /items/:itemId/comments` | JwtAuthGuard + ItemScopeGuard |
| `ToggleItemCheckedUseCase` | Interno (no inyectado; el toggle se hace vía `UpdateItemUseCase`) | — |

## ai

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `ExtractItemsUseCase` | `POST /ai/extract-items` | JwtAuthGuard (sin scope de familia) |
| `DedupCheckUseCase` | `POST /families/:familyId/catalog/dedup-check` (también interno) | JwtAuthGuard + FamilyScopeGuard |
| `GetFrequentItemsUseCase` | `GET /families/:familyId/frequent-items` | JwtAuthGuard + FamilyScopeGuard |
| `UpsertCatalogItemUseCase` | Interno (fire-and-forget desde `ShoppingListsController`) | — |

## menu

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `SuggestMenuUseCase` | `POST /families/:familyId/menu/suggest` | JwtAuthGuard + FamilyScopeGuard + RateLimitGuard (5/min) |
| `GenerateListFromMenuUseCase` | `POST /families/:familyId/menu/to-list` | JwtAuthGuard + FamilyScopeGuard |

## fridge

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `AddFridgeItemUseCase` | `POST /families/:familyId/fridge` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `ListFridgeItemsUseCase` | `GET /families/:familyId/fridge` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetFridgeItemUseCase` | `GET /fridge-items/:itemId` | JwtAuthGuard + FridgeItemScopeGuard (miembro) |
| `UpdateFridgeItemUseCase` | `PATCH /fridge-items/:itemId` | JwtAuthGuard + FridgeItemScopeGuard |
| `DeleteFridgeItemUseCase` | `DELETE /fridge-items/:itemId` | JwtAuthGuard + FridgeItemScopeGuard |
| `EatFridgeItemUseCase` | `POST /fridge-items/:itemId/eat` | JwtAuthGuard + FridgeItemScopeGuard |
| `ThrowFridgeItemUseCase` | `POST /fridge-items/:itemId/throw` | JwtAuthGuard + FridgeItemScopeGuard |
| `FreezeFridgeItemUseCase` | `POST /fridge-items/:itemId/freeze` | JwtAuthGuard + FridgeItemScopeGuard |
| `GetExpiringSoonUseCase` | Interno (consumido por el cron de notificaciones) | — |

## tasks

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `CreateTaskUseCase` | `POST /families/:familyId/tasks` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `ListTasksUseCase` | `GET /families/:familyId/tasks` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetTaskUseCase` | `GET /tasks/:taskId` | JwtAuthGuard + TaskScopeGuard (miembro de la familia de la tarea) |
| `UpdateTaskUseCase` | `PATCH /tasks/:taskId` | JwtAuthGuard + TaskScopeGuard |
| `DeleteTaskUseCase` | `DELETE /tasks/:taskId` | JwtAuthGuard + TaskScopeGuard |
| `SetAssigneesUseCase` | `PATCH /tasks/:taskId/assignees` | JwtAuthGuard + TaskScopeGuard |
| `AddTaskPhotoUseCase` | `POST /tasks/:taskId/photos` | JwtAuthGuard + TaskScopeGuard |
| `RemoveTaskPhotoUseCase` | `DELETE /tasks/:taskId/photos/:photoId` | JwtAuthGuard + TaskScopeGuard |
| `GenerateListFromTaskUseCase` | `POST /tasks/:taskId/generate-list` | JwtAuthGuard + TaskScopeGuard |

## calendar

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `CreateEventUseCase` | `POST /families/:familyId/calendar/events` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `ListEventsUseCase` | `GET /families/:familyId/calendar/events` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetEventUseCase` | `GET /calendar/events/:eventId` | JwtAuthGuard + EventScopeGuard (miembro de la familia del evento) |
| `UpdateEventUseCase` | `PATCH /calendar/events/:eventId` | JwtAuthGuard + EventScopeGuard |
| `DeleteEventUseCase` | `DELETE /calendar/events/:eventId` | JwtAuthGuard + EventScopeGuard |
| `SetAttendeesUseCase` | `PATCH /calendar/events/:eventId/attendees` | JwtAuthGuard + EventScopeGuard |

## plans

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `CreatePlanUseCase` | `POST /families/:familyId/plans` | JwtAuthGuard (miembro de la familia) |
| `ListPlansUseCase` | `GET /families/:familyId/plans` | JwtAuthGuard (miembro de la familia) |
| `GetPlanUseCase` | `GET /plans/:planId` | JwtAuthGuard (miembro con acceso al plan) |
| `UpdatePlanUseCase` | `PATCH /plans/:planId` | JwtAuthGuard (miembro de la familia propietaria) |
| `DeletePlanUseCase` | `DELETE /plans/:planId` | JwtAuthGuard (miembro de la familia propietaria) |
| `SetRsvpUseCase` | `POST /plans/:planId/rsvp` | JwtAuthGuard (miembro con acceso al plan) |
| `SharePlanUseCase` | `POST /plans/:planId/share` | JwtAuthGuard (miembro de la familia propietaria) |
| `SendPlanMessageUseCase` | `POST /plans/:planId/messages` | JwtAuthGuard (miembro con acceso al plan) |
| `ListPlanMessagesUseCase` | `GET /plans/:planId/messages` | JwtAuthGuard (miembro con acceso al plan) |
| `CreateSavedPlaceUseCase` | `POST /families/:familyId/places` | JwtAuthGuard (miembro de la familia) |
| `ListSavedPlacesUseCase` | `GET /families/:familyId/places` | JwtAuthGuard (miembro de la familia) |
| `DeleteSavedPlaceUseCase` | `DELETE /places/:placeId` | JwtAuthGuard (miembro de la familia propietaria del lugar) |

## budget

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `ExtractReceiptUseCase` | `POST /families/:familyId/receipts/extract` | JwtAuthGuard + FamilyScopeGuard + RateLimitGuard (5/min) |
| `CreateReceiptUseCase` | `POST /families/:familyId/receipts` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `ListReceiptsUseCase` | `GET /families/:familyId/receipts` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetSpendSummaryUseCase` | `GET /families/:familyId/spend-summary` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetReceiptUseCase` | `GET /receipts/:receiptId` | JwtAuthGuard + ReceiptScopeGuard (miembro de la familia del ticket) |
| `UpdateReceiptUseCase` | `PATCH /receipts/:receiptId` | JwtAuthGuard + ReceiptScopeGuard |
| `DeleteReceiptUseCase` | `DELETE /receipts/:receiptId` | JwtAuthGuard + ReceiptScopeGuard |

## romantic

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `CreateCoupleUseCase` | `POST /families/:familyId/couple` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `GetMyCoupleUseCase` | `GET /families/:familyId/couple` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `CreateCoupleNoteUseCase` | `POST /couples/:coupleId/notes` | JwtAuthGuard + CoupleScopeGuard (solo los 2 miembros) |
| `ListCoupleNotesUseCase` | `GET /couples/:coupleId/notes` | JwtAuthGuard + CoupleScopeGuard (solo los 2 miembros) |
| `AddChallengeUseCase` | `POST /couples/:coupleId/challenges` | JwtAuthGuard + CoupleScopeGuard (solo los 2 miembros) |
| `ListChallengesUseCase` | `GET /couples/:coupleId/challenges` | JwtAuthGuard + CoupleScopeGuard (solo los 2 miembros) |
| `MarkChallengeDoneUseCase` | `POST /couples/:coupleId/challenges/done` | JwtAuthGuard + CoupleScopeGuard (solo los 2 miembros) |
| `DoMischiefUseCase` | `POST /couples/:coupleId/mischief` | JwtAuthGuard + CoupleScopeGuard (solo los 2 miembros) |

## notifications

| Caso de uso | Endpoint | Autorización |
|---|---|---|
| `SubscribePushUseCase` | `POST /families/:familyId/notifications/subscribe` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `UnsubscribePushUseCase` | `DELETE /families/:familyId/notifications/subscribe` | JwtAuthGuard + FamilyScopeGuard (miembro) |

## stats (consultas de lectura, read-model CQRS)

| Consulta | Endpoint | Autorización |
|---|---|---|
| `FamilyStatsQuery.getStats` | `GET /families/:familyId/stats` | JwtAuthGuard + FamilyScopeGuard (miembro) |
| `FamilyStatsQuery.getMemberStats` | `GET /families/:familyId/leaderboard` | JwtAuthGuard + FamilyScopeGuard (miembro) |
