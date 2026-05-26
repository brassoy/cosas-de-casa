# Auditoría de contratos — API ↔ frontend

Verificación de coherencia de los contratos de la API frente a los casos de uso documentados
en [`../casos-de-uso.md`](../casos-de-uso.md). Auditoría estática (lectura de código); **no se
ha modificado código de producción**, solo se proponen correcciones.

## Metodología: las tres capas

Cada endpoint atraviesa tres definiciones del mismo contrato. Para que la API sea correcta,
las tres deben coincidir:

1. **Contrato HTTP** — `packages/contracts/src/{ctx}.ts`: schemas Zod compartidos con el
   frontend. Es lo que el cliente cree que envía y recibe.
2. **DTO de entrada** — `apps/api/src/contexts/{ctx}/interface/dto/*.dto.ts`: validación
   `class-validator` que aplica el `ValidationPipe` global (`whitelist + forbidNonWhitelisted`).
3. **Command/Result del caso de uso** — `application/*.use-case.ts`: el contrato de la capa de
   aplicación, y la salida real que el `Presenter` transforma en DTO de respuesta.

> **Causa raíz de casi todo lo que sigue**: hay **dos fuentes de verdad para la validación de
> entrada** — `class-validator` (DTO) y Zod (contrato). Nada las mantiene sincronizadas, así que
> divergen silenciosamente. Ver [Recomendaciones](#recomendaciones).

## Resumen ejecutivo

| Severidad | Hallazgos | Naturaleza |
|---|---|---|
| 🔴 Alta | 3 | Un bug funcional, una fuga de lógica de negocio a la capa interface, un endpoint fantasma en doc |
| 🟠 Media | 7 | Validación más laxa que el contrato, salidas sin schema, campos no mapeados |
| 🟡 Baja | 8 | Divergencias de formato/normalización, código muerto, deuda de capas |

Lo importante: **la mayoría son la API siendo MÁS permisiva que su propio contrato** (el DTO deja
pasar lo que Zod rechazaría). Eso significa que el frontend tipado está protegido, pero un cliente
que llame a la API directamente (o un test, o un atacante) puede meter datos fuera de contrato.

---

## 🔴 Alta

### A1 · social · `RedeemFriendInviteUseCase` · regex del `code` inconsistente
- **Capas**: el DTO `RedeemFriendInviteDto` valida `code` con `@Matches(/^[0-9A-Z]{8}$/)` — acepta `I`, `L`, `O`, `U`. El contrato Zod (`RedeemFriendInviteInputSchema`) y el dominio usan **Crockford Base32**, que excluye precisamente esas cuatro letras (`/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/`).
- **Efecto**: un código con `I/L/O/U` pasa la validación de entrada, llega al caso de uso, no coincide con ningún hash de PIN y devuelve `InvalidFriendInvitePinError` (422). El usuario ve "PIN inválido" cuando el problema real es de formato — y el `code` nunca debió aceptarse.
- **Corrección**: alinear el regex del DTO con el del contrato (o derivar el DTO del schema Zod).

### A2 · shopping · `AddItemUseCase` · la orquestación vive en el controller
- **Capas**: `forceAdd` existe en el DTO (`AddItemDto`) y en `AddItemInputSchema`, pero **no** en `AddItemCommand`. `AddItemUseCase.execute` solo crea el ítem (camino `ADD_NEW`). El flujo completo —comprobar dedup, decidir `SUGGEST`/`AUTO_MERGE`/`ADD_NEW`, respetar `forceAdd`, crear ítem y refrescar el catálogo— está escrito en el método del `ShoppingListsController`.
- **Efecto**: el "caso de uso" público real es el handler del controller, no `AddItemUseCase`. La lógica de negocio se filtra a la capa interface, que es justo lo que la arquitectura hexagonal busca evitar. La respuesta `AddItemResultDto` (`decision`/`candidates`) no la produce ningún caso de uso, sino el controller.
- **Corrección**: extraer un caso de uso orquestador (p. ej. `AddItemToListUseCase`) en `application/` que reciba `forceAdd` y encapsule dedup + creación + catálogo, y dejar el controller como adaptador delgado.

### A3 · fridge · `GetExpiringSoonUseCase` · endpoint fantasma en la documentación
- **Capas**: la tabla de endpoints de `fridge.md` documentaba `GET /families/:familyId/fridge/expiring-soon`, pero ese endpoint **no existe** en `FridgeController`. El caso de uso solo lo consume internamente el cron de notificaciones.
- **Efecto**: documentación que promete una ruta inexistente. Corregido en esta entrega (ver [Rutas](#bugs-de-documentación-de-rutas-corregidos)).
- **Corrección**: ya aplicada en `fridge.md` (marcado como interno). Si se quiere exponer, hay que añadir el handler y su guard de scope.

---

## 🟠 Media

| # | Contexto · Caso | Discrepancia | Corrección |
|---|---|---|---|
| M1 | family · `ListMembers` · `avatarUrl` | `FamilyMemberDtoSchema` declara `avatarUrl?` pero `FamilyPresenter.toMemberDto` nunca lo mapea → siempre ausente en la respuesta | Mapear el campo en el presenter, o quitarlo del schema |
| M2 | groups · `ListGroupMembers` · `avatarUrl` | Idéntico a M1 en `GroupPresenter` | Idem |
| M3 | social · `RedeemFriendInvite` · `familyId` | El DTO solo usa `@IsString()` (sin `@IsUUID()`); el contrato exige `UuidSchema`. Un valor no-UUID llega al repositorio y revienta con error de Postgres sin controlar | Añadir `@IsUUID('4')` al DTO |
| M4 | fridge · `Add/UpdateFridgeItem` · `quantity` | El DTO usa `@IsNumberString()`, que acepta negativos (`"-5"`); Zod y el dominio exigen positivo. El dominio acaba lanzando 422, pero la primera línea de defensa lo deja pasar | `@Matches(/^\d+(\.\d+)?$/)` en el DTO |
| M5 | fridge · `EatFridgeItem` · respuesta | Devuelve `{ deleted, itemId }` sin schema Zod en el contrato → el cliente no tiene tipo | Añadir `EatFridgeItemResultSchema` |
| M6 | notifications · `SubscribePush` · respuesta | El controller devuelve `{ id }`, pero no hay schema Zod que lo describa (existe `PushSubscriptionDtoSchema` completo, no usado aquí) | Añadir `SubscribePushResponseSchema = z.object({ id: UuidSchema })` |
| M7 | shopping/menu · `GenerateListFromMenu` | Llama `AddItemUseCase` en bucle **sin pasar por el dedup**: los ingredientes del menú se añaden siempre como `ADD_NEW`, pueden duplicar artículos ya presentes | Pasar por dedup, o documentar como decisión consciente |

---

## 🟡 Baja

| # | Contexto · Caso | Discrepancia | Corrección |
|---|---|---|---|
| B1 | budget · campos monetarios | `number` (DTO/Zod) → `string` (numeric PG en dominio) → `number` (presenter). Funciona, pero la conversión está repartida entre controller (entrada) y presenter (salida) | Centralizar; ya razonado en ADR-0014 |
| B2 | groups · `CreateGroup` · `name` | El DTO no hace `@Transform(trim)`; el Zod sí `.trim()`. `CreateFamilyDto` sí lo hace | Añadir el `@Transform` al DTO de groups |
| B3 | social · `GenerateFriendInvite` | Revocar el PIN previo e insertar el nuevo son dos operaciones sin `UnitOfWork` (family/groups sí lo usan). Ventana de concurrencia mínima | Envolver en `SocialUnitOfWork` |
| B4 | tasks · `Create/UpdateTask` · fechas | DTO `@IsISO8601({strict:false})` (acepta timestamps completos) vs Zod `regex(/^\d{4}-\d{2}-\d{2}$/)` (solo fecha) | Alinear a `@Matches(/^\d{4}-\d{2}-\d{2}$/)` |
| B5 | fridge · `Add/Update` · `expiryDate` | Mismo desajuste de fecha que B4 | Idem |
| B6 | calendar · `Create/Update` · `startsAt`/`endsAt` | DTO `@IsISO8601({strict:true})` (sin exigir offset) vs Zod `datetime({offset:true})` (lo exige) | Alinear la exigencia de offset |
| B7 | shopping · `ToggleItemCheckedUseCase` | El caso de uso existe pero el controller no lo inyecta ni usa (el toggle va por `UpdateItemUseCase`) → código muerto | Eliminarlo o darle endpoint propio |
| B8 | menu · `GenerateListFromMenu` | El controller devuelve el resultado del use case sin presenter; funciona por coincidencia de tipos, pero rompe la separación de capas | Introducir un presenter explícito |

---

## Bugs de documentación de rutas (corregidos)

Las tablas de **Endpoints principales** de varios módulos tenían rutas que no coincidían con el
controller real. Se han corregido en esta entrega:

| Módulo | Antes (incorrecto) | Ahora (real) |
|---|---|---|
| social | `/families/:familyId/friend-invite`, `.../friend-invite/redeem`, `DELETE /families/:familyId/friends/:otherFamilyId` | `/families/:familyId/friend-invites`, `POST /friends/redeem`, `DELETE /friends/:linkId` |
| calendar | `/families/:familyId/events`, `/events/:eventId` (sin `/calendar/`) | `/families/:familyId/calendar/events`, `/calendar/events/:eventId` |
| plans | `/families/:familyId/saved-places`, `/saved-places/:placeId` | `/families/:familyId/places`, `/places/:placeId` |
| notifications | `/families/:familyId/push-subscriptions` | `/families/:familyId/notifications/subscribe` |
| fridge | `GET /families/:familyId/fridge/expiring-soon` (no existe) | marcado como caso de uso interno (cron) |

## Cobertura actual de tests de contrato

`packages/contracts/src/index.test.ts` valida **~10 schemas Zod en aislamiento** (parse de
casos válidos e inválidos): `UuidSchema`, `MembershipRoleSchema`, `AddItemDecisionSchema`,
`JoinPinCodeSchema`, `JoinFamilyInputSchema`, `CreateFamilyInputSchema`,
`GeneratePinResponseSchema`, `AuthMeDtoSchema`, `ShoppingItemDtoSchema`,
`ShoppingListDtoSchema`, `FamilyDtoSchema`.

Lo que **no** comprueba hoy nada:
- Que el **DTO de entrada acepte exactamente lo que el schema Zod acepta** (paridad de entrada).
- Que el **presenter produzca algo que el schema Zod de salida valide** (round-trip de salida).
- 13 de 15 contextos no tienen ningún test de contrato.

---

## Recomendaciones

1. **Una sola fuente de verdad para la validación** (ataca la causa raíz). Hoy el DTO
   (`class-validator`) y el contrato (Zod) se definen por separado y divergen. Opciones:
   - **`nestjs-zod`**: deriva el DTO y la validación directamente de los schemas Zod del paquete
     `contracts`. El contrato compartido pasa a ser la única verdad. *(Recomendada.)*
   - Validar en el controller con los schemas Zod vía un `ZodValidationPipe`, eliminando los DTOs.

   Con esto desaparecen A1, M3, M4, B2, B4, B5, B6 de un plumazo, porque dejarían de existir dos
   definiciones que sincronizar.

2. **Tests de contrato que crucen capas** (en `packages/contracts` o en cada módulo):
   - *Round-trip de salida*: `Schema.parse(presenter.toDto(entidadDeEjemplo))` por cada presenter.
   - *Paridad de entrada*: tabla de casos límite que confirme que DTO y Zod aceptan/rechazan lo mismo.

3. **Resolver A2** (orquestación de `AddItem`): extraer el flujo de dedup a la capa de aplicación.
   Es el único hallazgo que toca la arquitectura, no solo la validación.

4. **Salidas tipadas completas**: añadir los schemas de respuesta que faltan (M5, M6) para que el
   frontend no consuma campos sin contrato.
