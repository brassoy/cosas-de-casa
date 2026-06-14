# Brief para lovable.dev — Cosas de Casa

Especificación EXACTA de lo que hay que pedirle a lovable para rediseñar la web y poder
**pegar el código casi directo** en `apps/web` (enfoque elegido: **adoptar Tailwind + shadcn/ui**).

## Cómo usar este documento

1. Pega el **Prompt maestro** (Parte A) como primer mensaje del proyecto en lovable.
2. Luego pega **un prompt de feature** (Parte B) por iteración, en el orden listado.
3. Exporta el código (GitHub/zip) e intégralo siguiendo la **Parte C**.

> **Idioma de los prompts**: están en **inglés** a propósito — lovable produce resultados más
> consistentes en inglés. El **copy de la UI** se exige explícitamente en **español de España
> (tuteo)**. Si prefieres los prompts en español, pídemelo y te los traduzco.

> **Regla de oro de integración**: lovable debe generar **componentes presentacionales puros**
> (reciben datos por `props`, emiten eventos por callbacks `onX`). **Sin** `fetch`, **sin**
> TanStack Query, **sin** stores, **sin** router de datos. Así tú solo conectas tus hooks/stores
> ya existentes (`useShopping`, `useFamilyTasks`, Dexie, Zustand…) a esos componentes. Esto está
> incrustado en cada prompt.

---

## Parte A — Prompt maestro (pégalo primero)

```text
You are building the UI for "Cosas de Casa", a mobile-first family-organization PWA
(shopping lists, tasks, fridge, calendar, plans, budget, couple corner). Build it as a
clean, modern, friendly consumer app. ALL user-facing copy must be in Spanish from Spain,
informal second person (tú): e.g. "Crear", "Añadir", "Guarda los cambios", "móvil", "vale".
Never use voseo or Latin-American vocabulary.

TECH STACK (use exactly this):
- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix primitives)
- lucide-react for icons
- react-router-dom ONLY for the preview/demo navigation

ARCHITECTURE RULES (critical — I will paste this code into an existing app):
- Generate PRESENTATIONAL components only. Components receive data via typed props and emit
  events via callbacks named onSomething. NO data fetching, NO react-query, NO global stores,
  NO API calls, NO auth. Use typed mock data in the preview pages only.
- Every screen = one exported component that takes a props object. Define and export the
  TypeScript interface for its props. Keep all domain types in src/types and import them.
- Keep components small and composable. Split lists/cards/dialogs into their own files.
- Mobile-first. Design for a 390px-wide phone. Use a max-width container (~480px) centered on
  larger screens. Touch targets >= 44px. Bottom sheets for detail/edit on mobile.
- Accessibility: semantic HTML, aria-labels on icon-only buttons, focus states, keyboard support
  for dialogs/drawers (Escape to close, focus trap).
- Every data screen must render four states: loading (skeletons), empty (illustration + CTA),
  error (message + retry), and content. Expose these via props (isLoading, error) where listed.

DESIGN SYSTEM (must match my existing CSS variables — do NOT hardcode colors):
Configure Tailwind + shadcn to read these CSS variables. IMPORTANT: my tokens are plain CSS
values (hex/px), NOT HSL triplets. So configure shadcn's color tokens to resolve DIRECTLY from
the variables (e.g. `background: 'var(--color-surface)'`), and do NOT wrap them in hsl().
This avoids the classic shadcn pitfall where `hsl(var(--token))` breaks with non-HSL values.

Define this globals.css (light theme shown; I will provide dark + other aesthetics later):
:root {
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

Map Tailwind theme.extend to these variables:
- colors: surface/surface-raised, text/text-muted/text-inverse, accent/accent-hover/accent-subtle,
  success, warning, error, info, border/border-strong
- shadcn bridge tokens: background=surface, foreground=text, primary=accent,
  primary-foreground=text-inverse, muted=surface-raised, muted-foreground=text-muted,
  destructive=error, card=surface, card-foreground=text, border=border, input=border, ring=accent
- borderRadius: sm/md/lg/card/full from --radius-*
- fontFamily: body, mono
- boxShadow: sm/md/lg from --shadow-*
Default font is Inter. Use rounded-card and shadow-md for cards. Accent is the primary action color.

TONE & FEEL: warm, family-friendly, playful but tidy. Emojis are used as section/nav icons
(I'll specify them). Generous spacing, clear hierarchy, large tap-friendly controls.

Start by scaffolding: Tailwind + shadcn config with the tokens above, globals.css, a src/types
folder, and a centered mobile AppShell layout (header + main + optional bottom area). Then wait
for my per-screen prompts.
```

---

## Parte B — Prompts por feature (uno por iteración)

> En cada prompt, los `interface` son los **tipos reales** de `@cosasdecasa/contracts`. Al
> integrar, sustituirás los mocks por tus hooks, pero los nombres/campos ya coincidirán.

### B0 — App shell + navegación + theming

```text
Build the app shell as presentational components.

<AppHeader> props: { title?: string; onMenu(): void; onHome(): void; onLogout?(): void;
  showThemeToggle?: boolean; onToggleTheme?(): void }
- Top bar: hamburger (☰) on the left opens the nav drawer, app title "Cosas de Casa" (button
  -> onHome), theme toggle + "Cerrar sesión" on the right (only if onLogout provided).

<NavDrawer> props: { open: boolean; familyName: string; activePath: string;
  onClose(): void; onNavigate(path: string): void }
- Left slide-in drawer (max width 280px, 80vw), backdrop, closes on Escape/backdrop/navigate.
- Shows familyName as title, then two labeled groups:
  Group "Hogar": 🏠 Inicio (/family/:id), 🛒 Listas de la compra (/lists), ✅ Tareas (/tasks),
  🧊 Nevera (/fridge), 📅 Calendario (/calendar), 📊 Estadísticas (/stats), 💕 Rincón (/romantic),
  🧾 Tickets y gasto (/budget), 🍳 Menú de la nevera (/menu)
  Group "Social": 🎉 Peñas (/groups), 🗺️ Planes (/plans), 👯 Familias amigas (/friends)
- Highlight the entry matching activePath.

Also build a generic <ScreenState> helper with variants loading (skeleton), empty (icon +
title + description + optional CTA button), and error (message + "Reintentar" button).
Theme support: app reads data-mode="light|dark" on <html>; provide a toggle that switches it.
```

### B1 — Auth (Login, Signup, Onboarding)

```text
Build 3 presentational screens with a centered card (max 420px) on a plain surface background.

types:
interface AuthFormProps { mode: 'login'|'signup'; isSubmitting: boolean; error?: string|null;
  onSubmit(v:{ email:string; password:string }): void; onGoogle(): void; onSwitchMode(): void }

<LoginPage>: title "Entrar", email + password fields, primary button "Entrar",
  secondary "Continuar con Google", link "¿No tienes cuenta? Regístrate".
<SignupPage>: title "Crear cuenta", same fields, button "Crear cuenta", Google button,
  link "¿Ya tienes cuenta? Entra". Show a hint after submit: "Revisa tu correo para confirmar la cuenta."
<OnboardingPage> props: { onCreateFamily(): void; onJoinFamily(): void }
  Centered welcome card: "¡Bienvenido a Cosas de Casa!", primary "Crea tu unidad familiar",
  secondary "Únete con un PIN".
Show inline error and disabled/loading states on submit.
```

### B2 — Family (CreateFamily, JoinFamily, FamilyHome)

```text
types:
interface FamilyMember { userId:string; displayName:string; avatarUrl?:string; role:'OWNER'|'MEMBER'; joinedAt:string }
interface GeneratedPin { code:string; expiresAt:string }

<CreateFamilyPage> props { isSubmitting; error?; onSubmit(v:{name:string; description?:string}):void }
  Form: "Nombre" (required, 1-100), "Descripción" (optional, textarea, 0-300). Button "Crear unidad familiar".

<JoinFamilyPage> props { isSubmitting; error?; onSubmit(code:string):void }
  Single monospace, centered, uppercase 8-char PIN input. Hint "N/8 caracteres". Button
  "Unirse a la familia" disabled until 8 chars. Map errors to: "El PIN no existe" / "El PIN ha
  caducado" / "El PIN ya se ha usado".

<FamilyHomePage> props {
  familyName:string; isOwner:boolean; members:FamilyMember[]; membersLoading:boolean;
  generatedPin?:GeneratedPin|null; pinLoading:boolean;
  notificationsEnabled:boolean; onToggleNotifications():void;
  onGeneratePin():void; onCopyPin():void; onShare(channel:'whatsapp'|'telegram'):void;
  onOpen(section:'lists'|'tasks'|'fridge'|'calendar'|'stats'|'romantic'|'budget'|'menu'|'groups'|'plans'|'friends'):void }
- Big family name header.
- "Accesos rápidos": a grid of large tappable tiles (emoji + label) for the 11 sections from the
  drawer (same emojis/labels). 2 columns on phone.
- A notifications toggle row.
- If isOwner: "Invitar miembros" card with "Genera un PIN" button; when generatedPin exists show
  the code in a monospace box with copy + WhatsApp/Telegram share buttons and "Caduca: <expiresAt>".
- "Miembros" list: avatar (or initial), displayName, role badge ("Propietario"/"Miembro").
Loading/empty/error for members via ScreenState.
```

### B3 — Shopping (ListsPage, ListDetailPage) + Menu

```text
types:
interface ShoppingListSummary { id:string; name:string; type:'MAIN'|'CUSTOM'; familyId:string; updatedAt:string }
interface ShoppingItem { id:string; name:string; quantity?:number|null; unit?:string|null;
  description?:string|null; purchaseLink?:string|null; checked:boolean; updatedAt:string }
interface FrequentItem { catalogItemId:string; displayName:string; frequency:number }
interface ItemComment { id:string; body:string; authorName:string; createdAt:string }
interface DedupCandidate { displayName:string; similarity:number; frequency:number }

<ListsPage> props { lists:ShoppingListSummary[]; isLoading; onOpenList(id):void; onCreateList(name:string):void }
- Header "Listas de la compra" + primary "+ Crear lista" (opens a dialog with a name input).
- Card per list: cart icon, name, "Principal" badge if type==='MAIN', chevron. Empty state CTA.

<ListDetailPage> props {
  listName:string; items:ShoppingItem[]; frequentItems:FrequentItem[]; isLoading; isOffline:boolean;
  voiceSupported:boolean;
  onBack():void;
  onAddItem(v:{name:string; quantity?:number; unit?:string; description?:string; purchaseLink?:string; forceAdd?:boolean}):void;
  onToggle(id:string, checked:boolean):void; onDelete(id:string):void; onQuickAdd(name:string):void;
  onVoice():void; // starts speech capture (parent handles recognition + IA extraction)
  onOpenItem(item:ShoppingItem):void }
- Header "‹ Listas" + listName.
- Add section: text input + "Añadir" button; an expandable "Unidad (opcional)" input; a mic button
  (states: idle 🎙 / listening ⏹ / processing ⏳) that calls onVoice; a horizontal scrollable bar of
  FrequentItem chips ("Añadir rápido", calls onQuickAdd).
- Two sections: "Por comprar (N)" and "Comprado (N)". Row = checkbox, name (strikethrough if checked),
  qty/unit meta, "Ver detalle", delete (✕).
- <DedupConfirmDialog> props { open; candidates:DedupCandidate[]; pendingName:string;
  onConfirm():void; onCancel():void } — "Ya tienes algo parecido a «{pendingName}». ¿Lo añades igualmente?"
- <ItemSheet> bottom sheet props { item:ShoppingItem; comments:ItemComment[]; onClose; onAddComment(body):void } —
  shows description, purchase link, and a comments thread with an input.
- <AddSuccessOverlay> brief celebratory overlay (animated cart emoji + random cheerful phrase), auto-dismiss.
- Offline: disable mic + show a subtle "Sin conexión" note; adding still works (optimistic).

<MenuPage> props { suggestion?: { dishes: { name:string; description?:string;
  usesFromFridge:string[]; missingIngredients:string[] }[] } | null;
  isLoading; aiUnavailable:boolean; error?:string|null; addedOk:boolean;
  selected:string[]; onToggleIngredient(name:string):void; onSuggest():void; onAddToList():void }
- Header "Menú de la nevera" + "Sugerir menú" (label "Pensando…" while loading).
- aiUnavailable -> warning alert "La IA no está disponible ahora mismo."
- DishCard per dish: name, description, green static chips "Tienes en la nevera", toggleable chips
  "Ingredientes que faltan" (selected highlighted). Sticky bottom bar: "N seleccionados" + "Añadir a la lista".
- Empty initial state: "Pulsa «Sugerir menú» para obtener ideas con lo que tienes."
```

### B4 — Tasks (TasksPage, TaskDetailPage)

```text
types:
type TaskStatus='OPEN'|'IN_PROGRESS'|'DONE';
interface TaskAssignee { userId:string; displayName:string }
interface TaskPhoto { id:string; url:string; createdAt:string }
interface Task { id:string; title:string; description?:string; status:TaskStatus;
  recommendedDate?:string; deadlineDate?:string; assignees:TaskAssignee[]; photoCount:number }
interface TaskDetail extends Task { photos:TaskPhoto[] }

<TasksPage> props { tasks:Task[]; members:TaskAssignee[]; isLoading;
  statusFilter:TaskStatus|'ALL'; assigneeFilter:string|'ALL';
  onChangeStatusFilter(v):void; onChangeAssigneeFilter(v):void; onOpen(id):void; onCreate(v):void }
- Header "Tareas" + "Crear tarea" (dialog: title, description, recommendedDate, deadlineDate, assignees).
- Filter row: status chips (Todos/Pendiente/En curso/Hecho) + assignee select.
- Card: title, 2-line description, deadline, assignee avatars, photo count, colored status badge.

<TaskDetailPage> props { task:TaskDetail; isEditing:boolean; members:TaskAssignee[]; isLoading;
  onBack; onToggleEdit; onSave(v):void; onSetAssignees(ids:string[]):void; onSetStatus(s:TaskStatus):void;
  onUploadPhoto(file:File):void; onGenerateShoppingList():void; uploadingPhoto:boolean }
- Read view: title, description, date chips ("Recomendada", "Límite"), assignee list.
- Edit view: text/textarea/date inputs + assignee checkboxes.
- Status segmented control: Pendiente / En curso / Hecho (active highlighted).
- Photo gallery grid with an upload tile (uses onUploadPhoto). Spinner while uploadingPhoto.
- "Generar lista de la compra" button.
Labels: status -> Pendiente/En curso/Hecho. Use Spain Spanish copy everywhere.
```

### B5 — Fridge

```text
types:
type FridgeLocation='FRIDGE'|'FREEZER'|'PANTRY';
interface FridgeItem { id:string; name:string; quantity?:string|null; unit?:string|null;
  location:FridgeLocation; expiryDate?:string|null }

<FridgePage> props { items:FridgeItem[]; isLoading; locationFilter:FridgeLocation|'ALL';
  onChangeFilter(v):void;
  onAdd(v):void; onEdit(item):void; onDelete(id):void;
  onEat(id):void; onThrow(id):void; onFreeze(id):void }
- Header "❄️ Nevera" + "Añadir" (dialog: name, quantity, unit, location, expiryDate).
- Location filter chips: Todo / 🧊 Nevera / ❄️ Congelador / 🥫 Despensa.
- "⚠️ Consumir primero" section: items expired/expiring soon, sorted by expiry (only if any).
- When filter is ALL, group items by location with a count per group.
- Item card: name, quantity+unit, an expiry badge with urgency color
  (Caducado=error, Caduca hoy/mañana=warning, fecha=normal, "Sin fecha"=muted),
  and quick actions: 🍽️ Comer, 🗑️ Tirar, 🧊 Congelar (hide if already FREEZER), ✏️ Editar, eliminar.
Empty state: "La despensa está vacía".
```

### B6 — Calendar

```text
types:
interface CalendarEvent { id:string; title:string; description?:string; location?:string;
  startsAt:string; endsAt?:string|null; allDay:boolean; recurrenceRule?:string|null; attendees:string[] }
interface Member { userId:string; displayName:string }

<CalendarPage> props { events:CalendarEvent[]; members:Member[]; view:'month'|'agenda';
  currentMonth:Date; selectedDay?:Date|null; isLoading;
  onChangeView(v):void; onPrevMonth():void; onNextMonth():void; onToday():void;
  onSelectDay(d:Date):void; onOpenEvent(e:CalendarEvent):void;
  onCreate(v):void; onUpdate(id,v):void; onSetAttendees(id,ids:string[]):void; onDelete(id):void }
- Header "📅 Calendario" + Mes/Agenda toggle + "Nuevo evento".
- Month grid: weeks start on Monday, today highlighted, adjacent-month days dimmed, event titles in cells.
- Agenda view: chronological list of upcoming events.
- Day panel: big date + that day's events + "Nuevo evento".
- <CalendarEventModal>: title (required), description, location, start (datetime-local), end,
  "Todo el día" toggle, recurrence (advanced, optional RRULE), attendees checkboxes. Recurring
  occurrences are read-only (show a note "Se edita el evento original").
```

### B7 — Groups (peñas) + Friends (familias amigas)

```text
types:
interface GroupSummary { id:string; name:string; description?:string; imageUrl?:string; role:'OWNER'|'MEMBER' }
interface GroupMember { userId:string; displayName:string; avatarUrl?:string; role:'OWNER'|'MEMBER'; joinedAt:string }
interface FriendFamily { linkId:string; familyId:string; familyName:string; familyImageUrl?:string; since:string }

<GroupsPage> props { groups:GroupSummary[]; isLoading; onJoin():void; onCreate():void; onOpen(id):void }
  Header "Mis peñas" + "Unirse con PIN" + "Nueva peña". Cards: avatar/initial, name, description, role.
<CreateGroupPage> props { isSubmitting; error?; onSubmit(v:{name;description?}):void } — centered card "Crea una peña".
<JoinGroupPage> props { isSubmitting; error?; onSubmit(code:string):void } — 8-char monospace PIN input,
  "N/8 caracteres", errors 404/410/409.
<GroupHomePage> props { name:string; members:GroupMember[]; membersLoading; isOwner:boolean;
  generatedPin?:{code;expiresAt}|null; pinLoading; onBack; onGeneratePin; onCopy; onShare(ch); onLeave() }
  Sections: "← Mis peñas" header, "Miembros", "Invitar miembros" (OWNER, PIN box + copy/share),
  "Salir de la peña" (red button, double confirm "¿Seguro?").

<FriendsPage> props { friends:FriendFamily[]; isLoading; generatedCode?:{code;expiresAt}|null;
  codeLoading; onGenerate; onCopy; onShare(ch); onGoRedeem(); onRemove(linkId) }
  Header "Familias amigas". "Invitar una familia amiga" (generate code + copy/share, note
  "Se usa una sola vez. Caduca tras usarse."), "¿Tienes un código?" -> onGoRedeem, "Tus familias
  amigas" list (avatar, name, "Amigas desde {since}", "Quitar" with confirm).
<RedeemFriendPage> props { activeFamilyName:string; isSubmitting; error?; onSubmit(code:string):void }
  "Canjear código de amistad", description mentioning activeFamilyName, monospace input, "Canjear código".
```

### B8 — Plans

```text
types:
type PlanStatus='proposed'|'confirmed'|'cancelled';
type Rsvp='going'|'maybe'|'declined';
interface PlanSummary { id:string; title:string; scheduledAt?:string; placeName?:string;
  status:PlanStatus; participantCount:number }
interface PlanParticipant { userId:string; displayName:string; status:Rsvp }
interface PlanMessage { id:string; userId:string; displayName:string; body:string; createdAt:string }
interface SavedPlace { id:string; name:string; address?:string }
interface Plan { id:string; title:string; description?:string;
  place?:{name:string; address?:string}; scheduledAt?:string; status:PlanStatus;
  participants:PlanParticipant[]; sharedWithFamilyIds:string[] }

<PlansPage> props { plans:PlanSummary[]; isLoading; onCreate():void; onOpen(id):void }
  Header "Planes" + "Nuevo plan". Card: title + status badge, 📅 date, 📍 place, 👥 count.
<CreatePlanPage> props { savedPlaces:SavedPlace[]; isSubmitting; error?;
  onSubmit(v:{title; description?; scheduledAt?; place?:{name;address?}; savePlace?:boolean}):void; onCancel() }
  Form: title (required), description, scheduledAt (datetime), place fieldset (pick a SavedPlace OR
  type name+address), "Guardar este lugar" checkbox. (Leave a placeholder where a Google Maps widget
  would go.)
<PlanDetailPage> props { plan:Plan; messages:PlanMessage[]; currentUserId:string;
  isOwner:boolean; friendFamilies:{familyId:string; familyName:string}[];
  isLoading; onBack; onRsvp(status:Rsvp); onShare(familyId); onSendMessage(body); onDelete() }
  Header title + status badge; description; 📅/📍 meta; "Tu respuesta" (Voy/Quizá/No voy);
  "Participantes" (name + rsvp); "Compartir con familia amiga" (OWNER, select + "Compartir",
  "Ya compartido con N"); "Chat del plan" (message bubbles, own messages aligned right, autoscroll
  to bottom, input + "Enviar"); "Eliminar plan" (OWNER, double confirm).
```

### B9 — Budget (Receipts, ReceiptDetail, Spend)

```text
types:
type ReceiptStatus='draft'|'confirmed';
type SpendCategory='groceries'|'household'|'dining_out'|'leisure'|'other';
interface ReceiptSummary { id:string; merchant?:string; purchasedAt:string; total:number;
  currency:string; status:ReceiptStatus; lineCount:number }
interface ReceiptLine { id:string; description:string; quantity?:number; unitPrice?:number;
  lineTotal:number; category:SpendCategory }
interface Receipt { id:string; merchant?:string; purchasedAt:string; total:number; currency:string;
  status:ReceiptStatus; lines:ReceiptLine[] }
interface SpendSummary { total:number; currency:string;
  byCategory:{category:SpendCategory; total:number}[]; byMonth:{month:string; total:number}[] }

<ReceiptsPage> props { receipts:ReceiptSummary[]; isLoading; capture:'idle'|'extracting'|'ai-unavailable';
  onCapture(file:File):void; onManualEntry():void; onCancelCapture():void;
  onOpen(id):void; onDelete(id):void; onGoSpend():void }
  Header "Tickets y gasto" + "Ver gasto" + "Capturar ticket" (hidden file input,
  accept="image/*" capture="environment"). capture==='extracting' -> spinner "Leyendo el ticket…".
  capture==='ai-unavailable' -> alert "No se ha podido leer el ticket" + "Alta manual" / "Cancelar".
  Receipt card: merchant, short date, line count, total, "Borrador" badge, delete.
<ReceiptDetailPage> props { receipt:Receipt; isEditing; isLoading; onBack; onToggleEdit;
  onSave(v):void; onDelete():void }
  Summary (merchant or "Sin establecimiento", long date, big total, draft badge) + "Artículos" list
  (description, category label, line amount). Edit mode = editable lines (ReceiptDraftEditor).
<SpendPage> props { summary:SpendSummary; isLoading; onBack():void }
  Total card; "Por categoría" horizontal bars (color per category: groceries green, household blue,
  dining_out orange, leisure purple, other gray); "Por mes" horizontal bars (month label like
  "junio de 2026"). Show currency formatted in es-ES (€).
```

### B10 — Stats

```text
types:
interface Badge { id:string; name:string; description:string; earnedAt?:string|null }
interface LeaderboardEntry { rank:number; userId:string; displayName?:string|null; email:string;
  points:number; badges:Badge[] }
interface MemberStats { userId:string; displayName:string; email:string; shoppingItemsAdded:number;
  tasksCompleted:number; fridgeItemsAdded:number; points:number; currentStreak:number; badges:Badge[] }
interface FamilyStats { totalTasksCompleted:number; totalShoppingItemsAdded:number;
  totalFridgeItemsAdded:number; members:MemberStats[] }

<StatsPage> props { leaderboard:LeaderboardEntry[]; stats:FamilyStats;
  leaderboardLoading; statsLoading }
  Header "📊 Estadísticas del hogar".
  "🏆 Ranking familiar": cards with medal (🥇🥈🥉 or #N), avatar/initial, name, big points,
  badge chips, 🔥 streak.
  "📈 Resumen del hogar": KPI grid (tareas completadas, ítems añadidos, productos en casa).
  "👥 Contribución por miembro": per member, two progress bars (ítems añadidos, tareas completadas),
  streak and badges.
  Empty leaderboard: 🏅 "Todavía no hay actividad. Completa tareas y añade ítems para aparecer."
```

### B11 — Romantic

```text
types:
interface Couple { id:string; userA:string; userB:string }
interface CoupleChallenge { id:string; challengeKey:string; description:string; done:boolean; doneAt?:string|null }
interface CoupleNote { id:string; authorId:string; authorName:string; body:string; createdAt:string }

<RomanticPage> props { couple:Couple|null; members:{userId;displayName}[];
  challenges:CoupleChallenge[]; notes:CoupleNote[]; currentUserId:string; isLoading;
  tab:'challenges'|'notes'; onChangeTab(t):void;
  onPairUp(partnerUserId:string):void; onToggleChallenge(challengeKey:string):void;
  onAddNote(body:string):void; onMischief():void }
  If couple===null -> <PairUpScreen>: pick a partner among members ("Emparejaos para abrir vuestro rincón").
  If couple: header "💕 Rincón de pareja" + "😈 Hacer maldad" (brief feedback "¡Maldad enviada! 😈").
  Tabs "🎯 Retos" (list with done checkbox) and "💌 Notas" (chronological thread; own notes aligned
  right; input to add). Spain Spanish copy, warm and playful.
```

---

## Parte C — Integración en `apps/web` (lo que harás tú)

1. **Instala el stack** en `apps/web`:
   - `pnpm add -D tailwindcss postcss autoprefixer && pnpm dlx tailwindcss init -p`
   - Inicializa shadcn (`pnpm dlx shadcn@latest init`) y añade los componentes que uses.
   - `pnpm add lucide-react class-variance-authority clsx tailwind-merge`.
2. **Puente de tokens (clave para conservar tus 3 estéticas)**: NO copies el `globals.css` del
   prototipo encima de tu sistema. En su lugar:
   - Mantén tu `tokens.base.css` / `tokens.themes.css` (siguen mandando `data-aesthetic` × `data-mode`).
   - Copia solo el `tailwind.config` que mapea los colores a `var(--color-*)` (sin `hsl()`).
   - Así Tailwind/shadcn leen tus variables y las 3 estéticas siguen funcionando sin tocar el CSS.
   - Verifica el pitfall del `hsl()`: los tokens shadcn deben resolver como `var(--color-...)` directo.
3. **Pega los componentes como presentacionales** dentro de cada `features/<f>/components/`.
4. **Sustituye los mocks por tus contenedores**: crea/usa los `*Page` contenedores que ya tienes
   (con TanStack Query/Zustand/Dexie) y pásales los datos + callbacks a los componentes de lovable.
   Reemplaza los `interface` locales por los imports de `@cosasdecasa/contracts` (mismos campos).
5. **Cablea la lógica especial** que lovable NO genera: dedup (`forceAdd`), Web Speech + `extract-items`,
   outbox offline + Realtime, subida a Supabase Storage, formato de dinero/fechas `es-ES`.
6. **Replantea el theming**: decide si las 3 estéticas (pixel/ios/okuda) se mantienen tal cual
   (recomendado, ya que el puente lo permite) o si simplificas. shadcn no necesita cambios si el
   puente está bien hecho.
7. Revisa accesibilidad y estados (loading/empty/error) en cada pantalla antes de dar por buena la integración.

> Sugerencia de orden de migración por valor/riesgo: empieza por **Shell + Auth + Family**, luego
> **Shopping** (la más rica), y deja para el final **Calendar** y **Budget** (las de UI más compleja).
