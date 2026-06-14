# Inventario de vistas — Cosas de Casa

Mapa completo de la interfaz web (`apps/web`): **27 pantallas** sobre **28 rutas**.
Para cada una: propósito, estado de implementación, datos que muestra (campos reales de
`@cosasdecasa/contracts`), secciones de UI, acciones del usuario → endpoint de la API y
estados especiales.

Úsalo como fuente para el rediseño con lovable (ver `brief-lovable.md`).

## Mapa de rutas

| Ruta | Pantalla | Guard | Familia en URL |
|---|---|---|---|
| `/login` | LoginPage | público (redirige si hay sesión) | — |
| `/signup` | SignupPage | público | — |
| `/` | (redirige a la familia activa, o OnboardingPage) | auth | — |
| `/onboarding` | OnboardingPage | auth | — |
| `/family/create` | CreateFamilyPage | auth | — |
| `/family/join` | JoinFamilyPage | auth | — |
| `/family/$familyId` | FamilyHomePage | auth + familia | ✅ |
| `/family/$familyId/lists` | ListsPage | auth + familia | ✅ |
| `/family/$familyId/lists/$listId` | ListDetailPage | auth + familia | ✅ |
| `/family/$familyId/tasks` | TasksPage | auth + familia | ✅ |
| `/tasks/$taskId` | TaskDetailPage | auth | — |
| `/family/$familyId/fridge` | FridgePage | auth + familia | ✅ |
| `/family/$familyId/calendar` | CalendarPage | auth + familia | ✅ |
| `/family/$familyId/stats` | StatsPage | auth + familia | ✅ |
| `/family/$familyId/romantic` | RomanticPage | auth + familia | ✅ |
| `/family/$familyId/budget` | ReceiptsPage | auth + familia | ✅ |
| `/family/$familyId/budget/receipts/$receiptId` | ReceiptDetailPage | auth + familia | ✅ |
| `/family/$familyId/budget/spend` | SpendPage | auth + familia | ✅ |
| `/family/$familyId/menu` | MenuPage | auth + familia | ✅ |
| `/groups` | GroupsPage | auth | — |
| `/groups/create` | CreateGroupPage | auth | — |
| `/groups/join` | JoinGroupPage | auth | — |
| `/groups/$groupId` | GroupHomePage | auth | — |
| `/friends` | FriendsPage | auth | — |
| `/friends/redeem` | RedeemFriendPage | auth | — |
| `/plans` | PlansPage | auth | — |
| `/plans/create` | CreatePlanPage | auth | — |
| `/plans/$planId` | PlanDetailPage | auth | — |

Todas las llamadas a la API van con prefijo `/api/v1` y `Authorization: Bearer <token>`.
En las rutas de abajo se omite el prefijo.

## Shell de la aplicación

- **AppHeader**: barra superior con botón ☰ (abre el drawer), título "Cosas de Casa"
  (vuelve al inicio), selector de tema y "Cerrar sesión".
- **NavDrawer**: menú lateral, solo si hay sesión + familia activa. Dos grupos:
  - **Hogar**: 🏠 Inicio · 🛒 Listas de la compra · ✅ Tareas · 🧊 Nevera · 📅 Calendario
    · 📊 Estadísticas · 💕 Rincón · 🧾 Tickets y gasto · 🍳 Menú de la nevera
  - **Social**: 🎉 Peñas · 🗺️ Planes · 👯 Familias amigas
- **App**: `<AppHeader/>` + `<main>` con el `<Outlet/>`. Pantalla "Cargando…" mientras
  se resuelve la sesión.

---

## Auth + Family

### LoginPage — `/login`
- **Propósito**: iniciar sesión con email/contraseña u OAuth de Google.
- **Estado**: implementada.
- **Datos**: ninguno (formulario sin contexto).
- **UI**: formulario `AuthForm` (email, contraseña, "Entrar"), botón "Continuar con Google",
  enlace a registro.
- **Acciones**: credenciales → `supabase.auth.signInWithPassword()`; Google →
  `supabase.auth.signInWithOAuth()` (callback `/auth/callback`). *Auth va por Supabase, no por la API REST.*
- **Estados**: error de credenciales, cargando, campos deshabilitados al enviar.

### SignupPage — `/signup`
- **Propósito**: registrar una cuenta nueva.
- **Estado**: implementada.
- **Datos**: ninguno.
- **UI**: `AuthForm` (email, contraseña, "Crear cuenta"), botón Google, enlace a login.
- **Acciones**: `supabase.auth.signUp()`; Google OAuth. Tras registrar, avisa de confirmar email.
- **Estados**: error (email duplicado/validación), cargando, pendiente de confirmación.

### OnboardingPage — `/` y `/onboarding`
- **Propósito**: primer paso del usuario sin familia: crear o unirse.
- **Estado**: esqueleto (solo navegación).
- **Datos**: ninguno.
- **UI**: tarjeta centrada "¡Bienvenido a Cosas de Casa!", botón primario "Crea tu unidad
  familiar" → `/family/create`, botón secundario "Únete con un PIN" → `/family/join`.
- **Acciones**: solo navegación local.

### CreateFamilyPage — `/family/create`
- **Propósito**: crear familia (el creador queda como OWNER).
- **Estado**: implementada.
- **Datos**: `name` (1-100, obligatorio), `description` (0-300, opcional).
- **UI**: formulario (nombre, descripción), botón "Crear unidad familiar", alerta de error.
- **Acciones**: `POST /families` `{ name, description? }` → `FamilySummaryDto`.
- **Estados**: cargando ("Creando…"), error.

### JoinFamilyPage — `/family/join`
- **Propósito**: unirse con un PIN de 8 caracteres (alfabeto Crockford Base32, sin I/L/O/U).
- **Estado**: implementada.
- **Datos**: `code` (8 chars, mayúsculas).
- **UI**: campo PIN monoespaciado y centrado, hint "N/8 caracteres", botón "Unirse a la familia"
  (deshabilitado si ≠ 8). Errores: 404 "no existe", 410 "caducado", 409 "ya usado".
- **Acciones**: `POST /families/join` `{ code }` → `FamilyDto`.
- **Estados**: cargando ("Uniéndose…"), validación local del PIN.

### FamilyHomePage — `/family/$familyId`
- **Propósito**: dashboard de la familia: accesos rápidos, miembros e invitación por PIN (OWNER).
- **Estado**: implementada.
- **Datos**: `activeFamily` (id, name); miembros `FamilyMemberDto[]` (userId, displayName,
  avatarUrl?, role OWNER|MEMBER, joinedAt); PIN generado (code, expiresAt).
- **UI**: cabecera con nombre; **grid de accesos rápidos** a las 11 secciones; toggle de
  notificaciones (`NotificationToggle`); bloque "Invitar miembros" (solo OWNER) con `PinShare`
  (PIN + copiar + compartir WhatsApp/Telegram); lista de miembros (avatar, nombre, rol).
- **Acciones**: `GET /families/:id/members`; `POST /families/:id/join-pins` (OWNER) →
  `{ code, expiresAt }`; copiar PIN; compartir vía enlaces.
- **Estados**: sin familia activa, cargando miembros, error, generando PIN.

---

## Shopping + Menú (con IA y voz)

### ListsPage — `/family/$familyId/lists`
- **Propósito**: listar las listas de la familia (MAIN + CUSTOM) y crear nuevas.
- **Estado**: implementada (offline-first con Dexie).
- **Datos**: listas con `id`, `name`, `type` (MAIN|CUSTOM), `familyId`, `createdAt`, `updatedAt`.
- **UI**: cabecera + "+ Crear lista"; tarjetas de lista (icono, nombre, badge si MAIN, chevron);
  estado vacío con CTA; modal de creación (input nombre + Cancelar/Crear).
- **Acciones**: `POST /families/:familyId/lists` `{ name }` (crea CUSTOM + encola en outbox);
  pulsar tarjeta → detalle.
- **Estados**: cargando, vacío, sin familia.

### ListDetailPage — `/family/$familyId/lists/$listId`
- **Propósito**: gestionar ítems de una lista con voz, dedup semántico y frecuentes.
- **Estado**: implementada (voz + dedup + offline).
- **Datos**: lista (id, name, type, familyId); ítems con `id`, `name`, `quantity`, `unit`,
  `description`, `purchaseLink`, `checked`, `listId`, `updatedAt`, `createdAt`; frecuentes
  (`displayName`, `frequency`, `catalogItemId`); comentarios (`id`, `body`, `authorName`,
  `authorId`, `createdAt`); candidatos dedup (`displayName`, `similarity`, `frequency`).
- **UI**: cabecera "‹ Listas" + nombre; **AddSection** (input + "Añadir", input "Unidad",
  botón micrófono 🎙/⏹/⏳ con transcripción y chips de confirmación, barra de frecuentes);
  secciones "Por comprar (N)" y "Comprado (N)" con `ItemRow` (checkbox, nombre, metadata,
  "Ver detalle", ✕); `ItemSheet` (bottom-sheet con detalle, descripción, link y comentarios);
  `DedupConfirmDialog`; `AddSuccessOverlay` (emoji animado + frase, auto-cierre); estado vacío.
- **Acciones**:
  - Añadir texto → `POST /lists/:listId/items` `{ name, quantity?, unit?, description?, purchaseLink? }`
    → `AddItemResultDto` (`decision`: ADD_NEW | SUGGEST | AUTO_MERGE).
  - SUGGEST → diálogo → re-`POST` con `forceAdd: true`.
  - Marcar/desmarcar → `PATCH /items/:itemId` `{ checked }`.
  - Eliminar → `DELETE /items/:itemId`.
  - Comentar → `POST /items/:itemId/comments` `{ body }`.
  - Voz → `POST /ai/extract-items` `{ phrase }` → `{ items: string[] }` → añade cada uno.
  - Frecuente → `POST /lists/:listId/items` `{ name }`.
- **Estados**: cargando, offline (añadir/voz limitados; outbox con `forceAdd`), voz no soportada,
  voz offline (deshabilitada), sin frecuentes (barra oculta), IA no disponible (voz falla, UI sigue).

### MenuPage — `/family/$familyId/menu`
- **Propósito**: sugerir menús desde la nevera con IA y enviar lo que falta a la lista.
- **Estado**: implementada.
- **Datos**: `MenuSuggestionDto` (`dishes[]`: name, description, usesFromFridge[], missingIngredients[]);
  `MenuToListResultDto` (listId, listName, itemsAdded, ingredients[]).
- **UI**: cabecera + "Sugerir menú"; estado vacío inicial; `DishCard` por plato (nombre, descripción,
  chips verdes "Tienes en la nevera", chips toggleables "Ingredientes que faltan"); barra inferior
  sticky con contador y "Añadir a la lista".
- **Acciones**: `POST /families/:familyId/menu/suggest` → `MenuSuggestionDto` (rate-limit 5/min);
  `POST /families/:familyId/menu/to-list` `{ ingredients[] }` → `MenuToListResultDto`.
- **Estados**: cargando ("Pensando…"), **IA no disponible (503)** con alerta, error genérico, éxito.

> **Patrones de shopping**
> - **Dedup semántico**: el backend compara por similitud vectorial contra el catálogo de la
>   familia. `SUGGEST` → el front pide confirmación y reenvía con `forceAdd: true`. `AUTO_MERGE`
>   hoy también pide confirmación (no se fusiona en silencio).
> - **Voz**: Web Speech API (es-ES) → `extract-items` (IA) → chips confirmables → flujo normal de dedup.
> - **Offline-first**: la UI lee de Dexie; escritura optimista + `outbox` (seq) que se reproduce al
>   reconectar; Supabase Realtime mergea cambios remotos (last-write-wins por `updatedAt`).

---

## Tasks + Fridge + Calendar

### TasksPage — `/family/$familyId/tasks`
- **Propósito**: listar tareas con filtros por estado y asignado.
- **Estado**: implementada.
- **Datos**: `TaskDto[]` (id, title, description, status OPEN|IN_PROGRESS|DONE, deadlineDate
  YYYY-MM-DD, assignees [userId, displayName], photos count).
- **UI**: cabecera + "Crear tarea"; filtros (estado + asignado); tarjetas (título, descripción
  truncada, fecha límite, asignados, nº fotos, badge de estado); estado vacío; modal de creación.
- **Acciones**: `GET /families/:familyId/tasks`; `POST /families/:familyId/tasks`; tarjeta → `/tasks/:taskId`.
- **Estados**: vacío, cargando, error, sin familia.

### TaskDetailPage — `/tasks/$taskId`
- **Propósito**: ver/editar una tarea con fotos, estado y generación de lista de la compra.
- **Estado**: implementada.
- **Datos**: `TaskDto` (id, title, description, status, recommendedDate, deadlineDate,
  assignees[], photos[] [id, taskId, storagePath, createdAt]).
- **UI**: cabecera (volver + editar/cancelar); vista lectura (título, descripción, chips de fechas,
  asignados); vista edición (campos + selector de asignados con checkboxes); estado (3 botones
  Pendiente/En curso/Hecho); galería de fotos (Supabase Storage `task-photos`, subida con compresión);
  bloque "Generar lista de la compra".
- **Acciones**: `GET /tasks/:taskId`; `PATCH /tasks/:taskId`; `PATCH /tasks/:taskId/assignees`;
  subir foto a Storage + `POST /tasks/:taskId/photos`; `POST /tasks/:taskId/generate-list` → navega
  a la lista creada.
- **Estados**: cargando, error, no encontrada, foto subiendo.

### FridgePage — `/family/$familyId/fridge`
- **Propósito**: inventario con urgencia por caducidad y clasificación por ubicación.
- **Estado**: implementada.
- **Datos**: `FridgeItemDto[]` (id, name, quantity?, unit?, location FRIDGE|FREEZER|PANTRY,
  expiryDate? YYYY-MM-DD, createdBy, createdAt, updatedAt).
- **UI**: cabecera ❄️ + "Añadir"; filtro por ubicación (chips Todo/Nevera/Congelador/Despensa);
  sección "⚠️ Consumir primero" (caducados/próximos); secciones por ubicación con contador;
  tarjeta de ítem (nombre, cantidad+unidad, badge de caducidad coloreado, acciones); estado vacío.
- **Acciones**: `GET /families/:familyId/fridge`; `POST /families/:familyId/fridge`;
  `PATCH /fridge-items/:itemId`; `DELETE /fridge-items/:itemId`; `POST /fridge-items/:itemId/eat`;
  `POST /fridge-items/:itemId/throw`; `POST /fridge-items/:itemId/freeze` (→ FREEZER).
- **Estados**: vacío, cargando, error, sin familia, urgencias destacadas.

### CalendarPage — `/family/$familyId/calendar`
- **Propósito**: calendario mensual/agenda con eventos, asistentes y recurrencia.
- **Estado**: implementada.
- **Datos**: `CalendarEventDto[]` (id [sufijo `_occ_N` en ocurrencias], title, description, location,
  startsAt ISO, endsAt?, allDay, recurrenceRule RRULE iCal?, attendees [userId], createdBy, createdAt, updatedAt).
- **UI**: cabecera 📅 + selector Mes/Agenda + "Nuevo evento"; `CalendarGrid` (semana empieza en lunes,
  hoy destacado, eventos en celdas); `AgendaView` (lista cronológica); `DayEventsPanel` (eventos del
  día + crear); `CalendarEventModal` (título, descripción, ubicación, inicio/fin datetime-local,
  "todo el día", RRULE, asistentes; ocurrencias solo lectura).
- **Acciones**: `GET /families/:familyId/calendar/events?from&to`; `POST /families/:familyId/calendar/events`;
  `PATCH /calendar/events/:eventId`; `PUT /calendar/events/:eventId/attendees`; `DELETE /calendar/events/:eventId`.
- **Estados**: sin familia, cargando, error; recurrencias solo lectura (se edita el evento padre);
  zona horaria local → ISO UTC al backend.

---

## Groups (peñas) + Friends (familias amigas) + Plans

### GroupsPage — `/groups`
- **Propósito**: listar las peñas del usuario.
- **Estado**: implementada.
- **Datos**: `GroupSummaryDto[]` (id, name, description?, imageUrl?, role OWNER|MEMBER, createdAt, updatedAt).
- **UI**: cabecera "Mis peñas"; botones "Unirse con PIN" y "Nueva peña"; tarjetas (avatar/inicial,
  nombre, descripción, rol); estado vacío con CTA.
- **Acciones**: `GET /groups`; tarjeta → `/groups/:groupId`.
- **Estados**: cargando, vacío, error.

### CreateGroupPage — `/groups/create`
- **Propósito**: crear una peña.
- **Estado**: implementada.
- **Datos**: `name` (obligatorio, ≤100), `description` (opcional, ≤300).
- **UI**: tarjeta centrada, "Crea una peña", formulario, "Crear peña", error.
- **Acciones**: `POST /groups` → navega a `/groups/:groupId`.
- **Estados**: cargando, error.

### JoinGroupPage — `/groups/join`
- **Propósito**: unirse a una peña con PIN de 8 caracteres.
- **Estado**: implementada.
- **Datos**: `code` (regex `^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$`).
- **UI**: tarjeta centrada, campo monoespaciado "XXXXXXXX", hint "N/8", botón deshabilitado hasta 8;
  errores 404/410/409.
- **Acciones**: `POST /groups/join` `{ code }` → navega a la peña.
- **Estados**: validación local, errores HTTP.

### GroupHomePage — `/groups/$groupId`
- **Propósito**: detalle de peña: miembros, PIN de invitación (OWNER) y salir.
- **Estado**: implementada.
- **Datos**: nombre (store); `GroupMemberDto[]` (userId, displayName, avatarUrl?, role, joinedAt);
  `GenerateGroupPinResponse` (code, expiresAt).
- **UI**: cabecera "← Mis peñas" + nombre; **Miembros** (avatar, nombre, rol); **Invitar** (OWNER):
  "Generar PIN" + caja con PIN + copiar/compartir; **Salir** (botón rojo con confirmación doble).
- **Acciones**: `GET /groups/:id/members`; `POST /groups/:id/join-pins` (OWNER);
  `DELETE /groups/:id/members/me`.
- **Estados**: cargando, error, confirmación de salida.

### FriendsPage — `/friends`
- **Propósito**: gestionar familias amigas (invitar, canjear, listar, quitar).
- **Estado**: implementada.
- **Datos**: `FriendFamilyDto[]` (linkId, familyId, familyName, familyImageUrl?, since);
  `FriendInviteResponse` (code, expiresAt).
- **UI**: cabecera "← Inicio" + "Familias amigas"; **Invitar** (generar código + copiar/compartir,
  "se usa una sola vez"); **¿Tienes un código?** → `/friends/redeem`; **Tus familias amigas**
  (tarjetas con avatar, nombre, "Amigas desde X", "Quitar" con confirmación).
- **Acciones**: `POST /families/:familyId/friend-invites`; `GET /families/:familyId/friends`;
  `DELETE /friends/:linkId`.
- **Estados**: cargando, vacío, confirmación.

### RedeemFriendPage — `/friends/redeem`
- **Propósito**: canjear un código de amistad para la familia activa.
- **Estado**: implementada.
- **Datos**: `code` (8 chars); familia activa (store).
- **UI**: cabecera "← Familias amigas"; descripción con nombre de la familia; campo monoespaciado;
  "Canjear código"; error.
- **Acciones**: `POST /friends/redeem` `{ code, familyId }` → `/friends`.
- **Estados**: cargando, error.

### PlansPage — `/plans`
- **Propósito**: listar planes (propios y compartidos).
- **Estado**: implementada.
- **Datos**: `PlanSummaryDto[]` (id, title, scheduledAt?, placeName?, ownerFamilyId,
  status proposed|confirmed|cancelled, participantCount).
- **UI**: cabecera "← Inicio" + "Planes" + "Nuevo plan"; tarjetas (título + badge estado, fecha/hora,
  lugar, nº participantes); estado vacío.
- **Acciones**: `GET /families/:familyId/plans`; tarjeta → `/plans/:planId`.
- **Estados**: cargando, vacío, error.

### CreatePlanPage — `/plans/create`
- **Propósito**: crear un plan con lugar (manual o guardado), fecha y descripción.
- **Estado**: implementada (TODO: widget de Google Maps).
- **Datos**: `title` (obligatorio, ≤200), `description?` (≤2000), `scheduledAt?`, lugar
  (nombre+dirección o `SavedPlaceDto` [id, name, address?]); checkbox "guardar lugar".
- **UI**: cabecera "← Planes" + "Nuevo plan"; fieldset de lugar (selector de guardados o campos
  manuales; checkbox guardar); botones Cancelar/Crear.
- **Acciones**: `GET /families/:familyId/places`; `POST /families/:familyId/plans`;
  `POST /families/:familyId/places` (si guarda lugar).
- **Estados**: cargando lugares, error.

### PlanDetailPage — `/plans/$planId`
- **Propósito**: detalle de plan: RSVP, participantes, compartir con amiga, chat en tiempo real, eliminar (OWNER).
- **Estado**: implementada (chat con realtime).
- **Datos**: `PlanDto` (id, title, description?, place [name, address?, lat?, lng?], scheduledAt?,
  status, ownerFamilyId, createdBy, participants[], sharedWithFamilyIds[], createdAt);
  `PlanParticipantDto` (userId, displayName, status going|maybe|declined);
  `PlanMessageDto` (id, planId, userId, displayName, body, createdAt).
- **UI**: cabecera "← Planes" + título + badge; descripción; fecha/lugar; **Tu respuesta** (3 botones
  RSVP); **Participantes** (nombre + estado); **Compartir con familia amiga** (OWNER, selector + ya
  compartido con N); **Chat** (mensajes con autoscroll + input "Enviar"); **Eliminar** (OWNER,
  confirmación doble).
- **Acciones**: `GET /plans/:planId`; `GET /families/:familyId/friends`; `POST /plans/:planId/rsvp`
  `{ status }`; `POST /plans/:planId/share` `{ familyId }`; `GET /plans/:planId/messages?before=<ISO>`;
  `POST /plans/:planId/messages` `{ body }`; `DELETE /plans/:planId`.
- **Estados**: cargando, RSVP pendiente, chat realtime (autoscroll), confirmación, no encontrado.

---

## Budget (tickets/gasto) + Stats + Romantic

### ReceiptsPage — `/family/$familyId/budget`
- **Propósito**: listar tickets y capturar nuevos por foto + OCR (IA).
- **Estado**: implementada.
- **Datos**: `ReceiptSummaryDto[]` (id, merchant?, purchasedAt ISO, total number, currency,
  status draft|confirmed, lineCount).
- **UI**: cabecera "Tickets y gasto" + "Ver gasto" + "Capturar ticket"; input de cámara oculto
  (`accept="image/*" capture="environment"`); flujo de 4 fases (idle → extracting → draft |
  ai-unavailable); aviso 503 con "Alta manual"/"Cancelar"; tarjetas de ticket (merchant, fecha,
  nº artículos, total, badge "Borrador", eliminar); estado vacío.
- **Acciones**: `POST /families/:familyId/receipts/extract` `{ imageBase64 }` → `ExtractReceiptResponse`
  (merchant?, purchasedAt?, total?, currency?, lines[]); `POST /families/:familyId/receipts`
  (`CreateReceiptInput`) → `ReceiptDto`; `DELETE /receipts/:receiptId`.
- **Estados**: **503 IA no disponible** (alta manual), cargando, vacío.

### ReceiptDetailPage — `/family/$familyId/budget/receipts/$receiptId`
- **Propósito**: ver/editar/eliminar un ticket.
- **Estado**: implementada.
- **Datos**: `ReceiptDto` (id, familyId, merchant?, purchasedAt, total, currency, status, lines[]);
  `ReceiptLineDto` (id, description, quantity?, unitPrice?, lineTotal, category
  groceries|household|dining_out|leisure|other).
- **UI**: cabecera (volver + Editar + Eliminar); resumen (merchant, fecha larga, total, badge);
  sección "Artículos" (descripción, categoría, importe); editor `ReceiptDraftEditor`.
- **Acciones**: `GET /receipts/:receiptId`; `PATCH /receipts/:receiptId` (`UpdateReceiptInput`);
  `DELETE /receipts/:receiptId` → vuelve a tickets.
- **Estados**: cargando, error.

### SpendPage — `/family/$familyId/budget/spend`
- **Propósito**: resumen de gasto por categoría y por mes (read-model).
- **Estado**: implementada.
- **Datos**: `SpendSummaryDto` (total, currency, byCategory [category, total], byMonth [month "YYYY-MM", total]).
- **UI**: cabecera "Tickets" + "Resumen de gasto"; tarjeta de total; "Por categoría" (barras con color
  por categoría); "Por mes" (barras con mes formateado).
- **Acciones**: `GET /families/:familyId/spend-summary?from&to`.
- **Estados**: cargando, error, vacío.

### StatsPage — `/family/$familyId/stats`
- **Propósito**: dashboard gamificado: ranking, logros y contribución por miembro.
- **Estado**: implementada.
- **Datos**: `LeaderboardEntryDto[]` (rank, userId, displayName?, email, points, badges
  [id, name, description, earnedAt?]); `StatsDto` (totalTasksCompleted, totalShoppingItemsAdded,
  totalFridgeItemsAdded, members [`MemberStatsDto`: userId, displayName, email, shoppingItemsAdded,
  tasksCompleted, fridgeItemsAdded, points, currentStreak, badges]).
- **UI**: cabecera "📊 Estadísticas del hogar"; "🏆 Ranking familiar" (medalla 🥇🥈🥉/#N, avatar,
  nombre, puntos, badges, racha 🔥); "📈 Resumen del hogar" (grid de KPIs); "👥 Contribución por
  miembro" (barras de ítems y tareas).
- **Acciones**: `GET /families/:familyId/leaderboard`; `GET /families/:familyId/stats`.
- **Estados**: cargando, error, vacío.

### RomanticPage — `/family/$familyId/romantic`
- **Propósito**: rincón de pareja con retos, notas y "maldad".
- **Estado**: implementada (flujo condicional con/sin pareja).
- **Datos**: `CoupleDto` (id, familyId, userA, userB, createdAt); `CoupleChallengeDto[]` (id, coupleId,
  challengeKey, description, done, doneAt?); `CoupleNoteDto[]` (id, coupleId, authorId, body 1-2000, createdAt).
- **UI**: **sin pareja** → `PairUpScreen` (elegir pareja entre miembros); **con pareja** → cabecera
  "💕 Rincón de pareja" + "😈 Hacer maldad" (feedback temporal); pestañas "🎯 Retos" (`ChallengesList`)
  y "💌 Notas" (`NotesThread` cronológico).
- **Acciones**: `GET /families/:familyId/couple` (404 = sin pareja); `POST /families/:familyId/couple`
  `{ partnerUserId }`; `GET /couples/:coupleId/challenges`; `POST /couples/:coupleId/challenges/done`
  `{ challengeKey }`; `GET /couples/:coupleId/notes`; `POST /couples/:coupleId/notes` `{ body }`;
  `POST /couples/:coupleId/mischief` (envía push).
- **Estados**: sin familia, cargando, error, sin pareja (PairUpScreen).
