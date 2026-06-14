# Prompt único para lovable.dev — Cosas de Casa

Pega TODO el bloque de abajo como primer mensaje en lovable. Genera la PWA completa (27 pantallas)
con Tailwind + shadcn y componentes presentacionales listos para integrar en `apps/web`.

> Nota: si lovable no termina las 27 de una sola vez, escríbele "continue building the remaining
> screens from the list" hasta completarlas.

```text
Build a complete, mobile-first family-organization PWA called "Cosas de Casa" (shopping lists,
tasks, fridge, calendar, plans, budget, couple corner, groups, friends, stats). Generate the FULL
UI for all screens listed below as a navigable demo with typed mock data. Make it polished, warm,
friendly and tidy.

LANGUAGE: ALL user-facing copy in Spanish from Spain, informal second person (tú). Use peninsular
vocabulary ("móvil", "ordenador", "vale", "coche", "añadir", "elige"). Never voseo, never
Latin-American vocabulary.

TECH STACK (use exactly this):
- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix primitives)
- lucide-react for icons
- react-router-dom for the demo navigation only

ARCHITECTURE RULES (I will paste this code into an existing app — follow strictly):
- Generate PRESENTATIONAL components only: each screen is one exported component that takes a typed
  props object and emits events via callbacks named onSomething. NO data fetching, NO react-query,
  NO global stores, NO API calls, NO auth logic. Put typed mock data only in the demo route pages.
- Define and export the TypeScript props interface of every screen. Keep all domain types in
  src/types/index.ts and import from there.
- Keep components small and composable: extract cards, list rows, dialogs and bottom sheets into
  their own files under the matching feature folder.
- Mobile-first: design for a 390px phone, center content in a max-width ~480px container on desktop.
  Touch targets >= 44px. Use bottom sheets for detail/edit on mobile.
- Accessibility: semantic HTML, aria-labels on icon-only buttons, visible focus, dialogs/drawers
  close on Escape and trap focus.
- Every data screen renders four states: loading (skeletons), empty (icon + title + CTA),
  error (message + "Reintentar"), and content. Drive them from props (isLoading, error).

DESIGN SYSTEM (match these CSS variables — do NOT hardcode colors):
Create src/styles/globals.css with these tokens (light + dark). IMPORTANT: tokens are plain CSS
values (hex/px), NOT HSL triplets. Configure Tailwind + shadcn so color tokens resolve DIRECTLY
from the variables, e.g. background: 'var(--color-surface)'. Do NOT wrap them in hsl() — that is
the classic shadcn pitfall and would break with these values.

:root, [data-mode='light'] {
  --color-surface:#ffffff; --color-surface-raised:#f5f5f5; --color-surface-overlay:rgba(0,0,0,.04);
  --color-text:#111111; --color-text-muted:#666666; --color-text-inverse:#ffffff;
  --color-accent:#2563eb; --color-accent-hover:#1d4ed8; --color-accent-subtle:#eff6ff;
  --color-success:#16a34a; --color-warning:#d97706; --color-error:#dc2626; --color-info:#0284c7;
  --color-border:#e5e7eb; --color-border-strong:#9ca3af;
  --radius-sm:4px; --radius-md:8px; --radius-lg:12px; --radius-card:12px; --radius-full:9999px;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px; --space-8:32px;
  --font-body:'Inter',system-ui,sans-serif; --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --shadow-sm:0 1px 2px rgba(0,0,0,.05); --shadow-md:0 4px 6px rgba(0,0,0,.07); --shadow-lg:0 10px 15px rgba(0,0,0,.1);
}
[data-mode='dark'] {
  --color-surface:#0f172a; --color-surface-raised:#1e293b; --color-surface-overlay:rgba(255,255,255,.05);
  --color-text:#f1f5f9; --color-text-muted:#94a3b8; --color-text-inverse:#0f172a;
  --color-accent:#60a5fa; --color-accent-hover:#93c5fd; --color-accent-subtle:#1e3a5f;
  --color-success:#4ade80; --color-warning:#fbbf24; --color-error:#f87171; --color-info:#38bdf8;
  --color-border:#334155; --color-border-strong:#64748b;
}
Tailwind theme.extend mapping:
- colors: surface (DEFAULT/raised), text (DEFAULT/muted/inverse), accent (DEFAULT/hover/subtle),
  success, warning, error, info, border (DEFAULT/strong)
- shadcn bridge tokens: background=surface, foreground=text, primary=accent,
  primary-foreground=text-inverse, muted=surface-raised, muted-foreground=text-muted,
  destructive=error, card=surface, card-foreground=text, border=border, input=border, ring=accent
- borderRadius sm/md/lg/card/full from --radius-*, fontFamily body/mono, boxShadow sm/md/lg.
Default font Inter. Cards use rounded-card + shadow-md. Accent = primary action color. Support a
light/dark toggle that sets data-mode on <html>.

SHARED TYPES (src/types/index.ts):
type Role='OWNER'|'MEMBER';
interface FamilyMember { userId:string; displayName:string; avatarUrl?:string; role:Role; joinedAt:string }
interface GeneratedPin { code:string; expiresAt:string }
interface ShoppingListSummary { id:string; name:string; type:'MAIN'|'CUSTOM'; familyId:string; updatedAt:string }
interface ShoppingItem { id:string; name:string; quantity?:number|null; unit?:string|null; description?:string|null; purchaseLink?:string|null; checked:boolean; updatedAt:string }
interface FrequentItem { catalogItemId:string; displayName:string; frequency:number }
interface ItemComment { id:string; body:string; authorName:string; createdAt:string }
interface DedupCandidate { displayName:string; similarity:number; frequency:number }
interface Dish { name:string; description?:string; usesFromFridge:string[]; missingIngredients:string[] }
type TaskStatus='OPEN'|'IN_PROGRESS'|'DONE';
interface TaskAssignee { userId:string; displayName:string }
interface TaskPhoto { id:string; url:string; createdAt:string }
interface Task { id:string; title:string; description?:string; status:TaskStatus; recommendedDate?:string; deadlineDate?:string; assignees:TaskAssignee[]; photoCount:number }
interface TaskDetail extends Task { photos:TaskPhoto[] }
type FridgeLocation='FRIDGE'|'FREEZER'|'PANTRY';
interface FridgeItem { id:string; name:string; quantity?:string|null; unit?:string|null; location:FridgeLocation; expiryDate?:string|null }
interface CalendarEvent { id:string; title:string; description?:string; location?:string; startsAt:string; endsAt?:string|null; allDay:boolean; recurrenceRule?:string|null; attendees:string[] }
interface GroupSummary { id:string; name:string; description?:string; imageUrl?:string; role:Role }
interface GroupMember { userId:string; displayName:string; avatarUrl?:string; role:Role; joinedAt:string }
interface FriendFamily { linkId:string; familyId:string; familyName:string; familyImageUrl?:string; since:string }
type PlanStatus='proposed'|'confirmed'|'cancelled';
type Rsvp='going'|'maybe'|'declined';
interface PlanSummary { id:string; title:string; scheduledAt?:string; placeName?:string; status:PlanStatus; participantCount:number }
interface PlanParticipant { userId:string; displayName:string; status:Rsvp }
interface PlanMessage { id:string; userId:string; displayName:string; body:string; createdAt:string }
interface SavedPlace { id:string; name:string; address?:string }
interface Plan { id:string; title:string; description?:string; place?:{name:string; address?:string}; scheduledAt?:string; status:PlanStatus; participants:PlanParticipant[]; sharedWithFamilyIds:string[] }
type ReceiptStatus='draft'|'confirmed';
type SpendCategory='groceries'|'household'|'dining_out'|'leisure'|'other';
interface ReceiptSummary { id:string; merchant?:string; purchasedAt:string; total:number; currency:string; status:ReceiptStatus; lineCount:number }
interface ReceiptLine { id:string; description:string; quantity?:number; unitPrice?:number; lineTotal:number; category:SpendCategory }
interface Receipt { id:string; merchant?:string; purchasedAt:string; total:number; currency:string; status:ReceiptStatus; lines:ReceiptLine[] }
interface SpendSummary { total:number; currency:string; byCategory:{category:SpendCategory; total:number}[]; byMonth:{month:string; total:number}[] }
interface Badge { id:string; name:string; description:string; earnedAt?:string|null }
interface LeaderboardEntry { rank:number; userId:string; displayName?:string|null; email:string; points:number; badges:Badge[] }
interface MemberStats { userId:string; displayName:string; email:string; shoppingItemsAdded:number; tasksCompleted:number; fridgeItemsAdded:number; points:number; currentStreak:number; badges:Badge[] }
interface FamilyStats { totalTasksCompleted:number; totalShoppingItemsAdded:number; totalFridgeItemsAdded:number; members:MemberStats[] }
interface Couple { id:string; userA:string; userB:string }
interface CoupleChallenge { id:string; challengeKey:string; description:string; done:boolean; doneAt?:string|null }
interface CoupleNote { id:string; authorId:string; authorName:string; body:string; createdAt:string }

APP SHELL & NAV:
- AppShell: centered mobile layout = AppHeader + main + (optional) content.
- AppHeader props { title?; onMenu(); onHome(); onLogout?(); onToggleTheme?() }: hamburger (☰) opens
  the drawer, "Cosas de Casa" title button (onHome), theme toggle + "Cerrar sesión" on the right.
- NavDrawer props { open; familyName; activePath; onClose(); onNavigate(path) }: left slide-in
  (max 280px / 80vw) + backdrop; closes on Escape/backdrop/navigate. Two labeled groups:
  "Hogar": 🏠 Inicio(/family/:id), 🛒 Listas de la compra(/lists), ✅ Tareas(/tasks), 🧊 Nevera(/fridge),
  📅 Calendario(/calendar), 📊 Estadísticas(/stats), 💕 Rincón(/romantic), 🧾 Tickets y gasto(/budget),
  🍳 Menú de la nevera(/menu). "Social": 🎉 Peñas(/groups), 🗺️ Planes(/plans), 👯 Familias amigas(/friends).
  Highlight the active entry.
- Generic ScreenState component with loading/empty/error variants used by all data screens.

SCREENS TO BUILD (each = presentational component with the listed props + the 4 states):

AUTH & FAMILY
1. LoginPage { mode:'login'; isSubmitting; error?; onSubmit({email,password}); onGoogle(); onSwitchMode() }
   Centered card (max 420px): "Entrar", email+password, primary "Entrar", "Continuar con Google",
   link "¿No tienes cuenta? Regístrate".
2. SignupPage { mode:'signup'; ... same props }: "Crear cuenta"; after submit show hint
   "Revisa tu correo para confirmar la cuenta."
3. OnboardingPage { onCreateFamily(); onJoinFamily() }: welcome card "¡Bienvenido a Cosas de Casa!",
   primary "Crea tu unidad familiar", secondary "Únete con un PIN".
4. CreateFamilyPage { isSubmitting; error?; onSubmit({name,description?}) }: "Nombre"(1-100, required),
   "Descripción"(0-300, textarea), button "Crear unidad familiar".
5. JoinFamilyPage { isSubmitting; error?; onSubmit(code) }: centered uppercase monospace 8-char PIN
   input, hint "N/8 caracteres", button "Unirse a la familia" disabled until 8. Error copy:
   "El PIN no existe" / "El PIN ha caducado" / "El PIN ya se ha usado".
6. FamilyHomePage { familyName; isOwner; members:FamilyMember[]; membersLoading; generatedPin?;
   pinLoading; notificationsEnabled; onToggleNotifications(); onGeneratePin(); onCopyPin();
   onShare('whatsapp'|'telegram'); onOpen(section) }: big family name; "Accesos rápidos" grid of
   large emoji tiles for the 11 sections (same emojis/labels as the drawer, 2 cols on phone);
   notifications toggle row; if isOwner an "Invitar miembros" card (generate PIN -> monospace code
   box + copy + WhatsApp/Telegram + "Caduca: …"); "Miembros" list (avatar/initial, name, role badge
   "Propietario"/"Miembro").

SHOPPING & MENU
7. ListsPage { lists:ShoppingListSummary[]; isLoading; onOpenList(id); onCreateList(name) }: header
   "Listas de la compra" + "+ Crear lista" (dialog with name input); list cards (cart icon, name,
   "Principal" badge if MAIN, chevron); empty CTA.
8. ListDetailPage { listName; items:ShoppingItem[]; frequentItems:FrequentItem[]; isLoading;
   isOffline; voiceSupported; onBack(); onAddItem({name,quantity?,unit?,description?,purchaseLink?,forceAdd?});
   onToggle(id,checked); onDelete(id); onQuickAdd(name); onVoice(); onOpenItem(item) }: header "‹ Listas"
   + listName; add section (text input + "Añadir", expandable "Unidad (opcional)", mic button with
   states idle 🎙/listening ⏹/processing ⏳ -> onVoice, horizontal FrequentItem chips "Añadir rápido");
   sections "Por comprar (N)" and "Comprado (N)" with rows (checkbox, name strikethrough if checked,
   qty/unit, "Ver detalle", delete ✕). Include DedupConfirmDialog { open; candidates:DedupCandidate[];
   pendingName; onConfirm(); onCancel() } ("Ya tienes algo parecido a «{pendingName}». ¿Lo añades
   igualmente?"); ItemSheet bottom sheet { item; comments:ItemComment[]; onClose; onAddComment(body) }
   (description, purchase link, comments thread + input); AddSuccessOverlay (animated cart emoji +
   cheerful phrase, auto-dismiss). Offline: disable mic + subtle "Sin conexión".
9. MenuPage { suggestion?:{dishes:Dish[]}|null; isLoading; aiUnavailable; error?; addedOk;
   selected:string[]; onToggleIngredient(name); onSuggest(); onAddToList() }: header "Menú de la nevera"
   + "Sugerir menú" ("Pensando…" while loading); aiUnavailable -> warning "La IA no está disponible
   ahora mismo."; DishCard per dish (name, description, green static chips "Tienes en la nevera",
   toggleable chips "Ingredientes que faltan"); sticky bottom bar "N seleccionados" + "Añadir a la
   lista"; empty initial "Pulsa «Sugerir menú» para obtener ideas con lo que tienes."

TASKS
10. TasksPage { tasks:Task[]; members:TaskAssignee[]; isLoading; statusFilter; assigneeFilter;
    onChangeStatusFilter(v); onChangeAssigneeFilter(v); onOpen(id); onCreate(v) }: header "Tareas" +
    "Crear tarea" (dialog: title, description, recommendedDate, deadlineDate, assignees); filter row
    (status chips Todos/Pendiente/En curso/Hecho + assignee select); card (title, 2-line description,
    deadline, assignee avatars, photo count, colored status badge).
11. TaskDetailPage { task:TaskDetail; isEditing; members:TaskAssignee[]; isLoading; uploadingPhoto;
    onBack; onToggleEdit; onSave(v); onSetAssignees(ids); onSetStatus(s); onUploadPhoto(file);
    onGenerateShoppingList() }: read view (title, description, "Recomendada"/"Límite" date chips,
    assignees); edit view (inputs + assignee checkboxes); status segmented control Pendiente/En
    curso/Hecho; photo gallery grid with upload tile (spinner while uploadingPhoto); "Generar lista
    de la compra" button.

FRIDGE
12. FridgePage { items:FridgeItem[]; isLoading; locationFilter; onChangeFilter(v); onAdd(v);
    onEdit(item); onDelete(id); onEat(id); onThrow(id); onFreeze(id) }: header "❄️ Nevera" + "Añadir"
    (dialog: name, quantity, unit, location, expiryDate); location chips Todo/🧊 Nevera/❄️ Congelador/
    🥫 Despensa; "⚠️ Consumir primero" section (expired/expiring soon by expiry, only if any); when
    filter ALL group by location with counts; item card (name, quantity+unit, expiry badge with
    urgency color: Caducado=error, Caduca hoy/mañana=warning, fecha=normal, "Sin fecha"=muted) and
    quick actions 🍽️ Comer, 🗑️ Tirar, 🧊 Congelar (hidden if already FREEZER), ✏️ Editar, eliminar.
    Empty "La despensa está vacía".

CALENDAR
13. CalendarPage { events:CalendarEvent[]; members:TaskAssignee[]; view:'month'|'agenda';
    currentMonth:Date; selectedDay?; isLoading; onChangeView(v); onPrevMonth(); onNextMonth();
    onToday(); onSelectDay(d); onOpenEvent(e); onCreate(v); onUpdate(id,v); onSetAttendees(id,ids);
    onDelete(id) }: header "📅 Calendario" + Mes/Agenda toggle + "Nuevo evento"; month grid (weeks
    start Monday, today highlighted, adjacent days dimmed, event titles in cells); agenda list; day
    panel (big date + events + "Nuevo evento"); CalendarEventModal (title required, description,
    location, start datetime-local, end, "Todo el día" toggle, optional recurrence RRULE, attendees
    checkboxes; recurring occurrences read-only with note "Se edita el evento original").

GROUPS & FRIENDS
14. GroupsPage { groups:GroupSummary[]; isLoading; onJoin(); onCreate(); onOpen(id) }: header "Mis
    peñas" + "Unirse con PIN" + "Nueva peña"; cards (avatar/initial, name, description, role).
15. CreateGroupPage { isSubmitting; error?; onSubmit({name,description?}) }: centered card "Crea una peña".
16. JoinGroupPage { isSubmitting; error?; onSubmit(code) }: 8-char monospace PIN input, "N/8
    caracteres", errors 404/410/409.
17. GroupHomePage { name; members:GroupMember[]; membersLoading; isOwner; generatedPin?; pinLoading;
    onBack; onGeneratePin; onCopy; onShare(ch); onLeave() }: "← Mis peñas" header; "Miembros";
    "Invitar miembros" (OWNER, PIN box + copy/share); "Salir de la peña" (red, double confirm "¿Seguro?").
18. FriendsPage { friends:FriendFamily[]; isLoading; generatedCode?; codeLoading; onGenerate; onCopy;
    onShare(ch); onGoRedeem(); onRemove(linkId) }: header "Familias amigas"; "Invitar una familia
    amiga" (generate code + copy/share, note "Se usa una sola vez. Caduca tras usarse."); "¿Tienes un
    código?" -> onGoRedeem; "Tus familias amigas" list (avatar, name, "Amigas desde {since}", "Quitar"
    with confirm).
19. RedeemFriendPage { activeFamilyName; isSubmitting; error?; onSubmit(code) }: "Canjear código de
    amistad", description mentioning activeFamilyName, monospace input, "Canjear código".

PLANS
20. PlansPage { plans:PlanSummary[]; isLoading; onCreate(); onOpen(id) }: header "Planes" + "Nuevo
    plan"; card (title + status badge, 📅 date, 📍 place, 👥 count).
21. CreatePlanPage { savedPlaces:SavedPlace[]; isSubmitting; error?; onSubmit({title,description?,
    scheduledAt?,place?,savePlace?}); onCancel() }: title (required), description, scheduledAt
    (datetime), place fieldset (pick a SavedPlace OR type name+address), "Guardar este lugar"
    checkbox, placeholder for a future Google Maps widget.
22. PlanDetailPage { plan:Plan; messages:PlanMessage[]; currentUserId; isOwner;
    friendFamilies:{familyId,familyName}[]; isLoading; onBack; onRsvp(status); onShare(familyId);
    onSendMessage(body); onDelete() }: title + status badge; description; 📅/📍 meta; "Tu respuesta"
    (Voy/Quizá/No voy); "Participantes" (name + rsvp); "Compartir con familia amiga" (OWNER, select +
    "Compartir", "Ya compartido con N"); "Chat del plan" (bubbles, own messages right-aligned,
    autoscroll to bottom, input + "Enviar"); "Eliminar plan" (OWNER, double confirm).

BUDGET
23. ReceiptsPage { receipts:ReceiptSummary[]; isLoading; capture:'idle'|'extracting'|'ai-unavailable';
    onCapture(file); onManualEntry(); onCancelCapture(); onOpen(id); onDelete(id); onGoSpend() }:
    header "Tickets y gasto" + "Ver gasto" + "Capturar ticket" (hidden file input accept="image/*"
    capture="environment"); extracting -> spinner "Leyendo el ticket…"; ai-unavailable -> alert "No
    se ha podido leer el ticket" + "Alta manual"/"Cancelar"; receipt card (merchant, short date,
    line count, total, "Borrador" badge, delete).
24. ReceiptDetailPage { receipt:Receipt; isEditing; isLoading; onBack; onToggleEdit; onSave(v);
    onDelete() }: summary (merchant or "Sin establecimiento", long date, big total, draft badge) +
    "Artículos" list (description, category label, line amount); edit mode = editable lines.
25. SpendPage { summary:SpendSummary; isLoading; onBack() }: total card; "Por categoría" horizontal
    bars (groceries green, household blue, dining_out orange, leisure purple, other gray); "Por mes"
    horizontal bars (month label like "junio de 2026"); currency formatted es-ES (€).

STATS
26. StatsPage { leaderboard:LeaderboardEntry[]; stats:FamilyStats; leaderboardLoading; statsLoading }:
    header "📊 Estadísticas del hogar"; "🏆 Ranking familiar" (medal 🥇🥈🥉 or #N, avatar/initial,
    name, big points, badge chips, 🔥 streak); "📈 Resumen del hogar" (KPI grid: tareas completadas,
    ítems añadidos, productos en casa); "👥 Contribución por miembro" (two progress bars per member +
    streak + badges); empty leaderboard 🏅 "Todavía no hay actividad. Completa tareas y añade ítems
    para aparecer."

ROMANTIC
27. RomanticPage { couple:Couple|null; members:{userId,displayName}[]; challenges:CoupleChallenge[];
    notes:CoupleNote[]; currentUserId; isLoading; tab:'challenges'|'notes'; onChangeTab(t);
    onPairUp(partnerUserId); onToggleChallenge(challengeKey); onAddNote(body); onMischief() }: if
    couple===null show PairUpScreen (pick a partner among members, "Emparejaos para abrir vuestro
    rincón"); else header "💕 Rincón de pareja" + "😈 Hacer maldad" (brief feedback "¡Maldad enviada!
    😈"); tabs "🎯 Retos" (list with done checkbox) and "💌 Notas" (chronological thread, own notes
    right-aligned, input to add).

FINAL DELIVERABLE: wire react-router with all the routes from the nav (login, signup, onboarding,
family home + the 8 home sections, groups, plans, friends and their sub-routes) and provide realistic
typed Spanish mock data so every screen is browsable through the header + drawer. Keep each screen a
pure presentational component with its exported props interface so the code can be dropped into an
existing app and connected to real data later.
```
